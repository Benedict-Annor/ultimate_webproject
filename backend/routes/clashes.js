const router   = require('express').Router();
const { body } = require('express-validator');
const supabase = require('../supabase');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const NUM_TO_DAY = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' };
const DAY_TO_NUM = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };

const FULL_SELECT = `
  id, course_1_code, course_2_code, day_of_week, time_range,
  status, description, resolution_note, resolved_at, created_at, updated_at,
  reporter:users!reported_by ( id, full_name, role ),
  resolver:users!resolved_by ( id, full_name )
`;

// GET /api/clashes/detected  — auto-detect overlapping entries from live timetable
router.get('/detected', requireAuth, async (req, res) => {
  try {
    const { data: entries, error: entErr } = await supabase
      .from('timetable_entries')
      .select(`
        id, day_of_week, start_time, end_time,
        offering:course_offerings( course:courses( id, code, title ) ),
        room:rooms( name ),
        lecturer:users!lecturer_id( id, full_name )
      `)
      .eq('status', 'active');
    if (entErr) throw entErr;

    const pairs = [];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i], b = entries[j];
        if (a.day_of_week !== b.day_of_week) continue;
        if (a.start_time >= b.end_time || b.start_time >= a.end_time) continue;
        pairs.push({ a, b });
      }
    }

    if (pairs.length === 0) return res.json([]);

    const { data: reports } = await supabase
      .from('clash_reports')
      .select('id, course_1_code, course_2_code, day_of_week, status, description, resolution_note, resolved_at, resolver:users!resolved_by( full_name )');

    const result = pairs.map(({ a, b }) => {
      const code1 = a.offering?.course?.code || '';
      const code2 = b.offering?.course?.code || '';
      const report = (reports || []).find(r =>
        r.day_of_week === a.day_of_week &&
        ((r.course_1_code === code1 && r.course_2_code === code2) ||
         (r.course_1_code === code2 && r.course_2_code === code1))
      );
      const overlapStart = a.start_time > b.start_time ? a.start_time : b.start_time;
      const overlapEnd   = a.end_time   < b.end_time   ? a.end_time   : b.end_time;
      return {
        id:              report ? report.id : null,
        detected_key:    `${a.id}::${b.id}`,
        has_report:      !!(report && report.id),
        course_1_code:   code1,
        course_2_code:   code2,
        course_1_title:  a.offering?.course?.title || '',
        course_2_title:  b.offering?.course?.title || '',
        day_of_week:     a.day_of_week,
        day:             NUM_TO_DAY[a.day_of_week],
        time_range:      `${overlapStart.substring(0, 5)} \u2013 ${overlapEnd.substring(0, 5)}`,
        status:          report ? report.status : 'pending',
        resolution_note: report ? report.resolution_note : null,
        resolved_at:     report ? report.resolved_at : null,
        resolver:        report ? report.resolver : null,
        entry_a: { id: a.id, room: a.room ? a.room.name : '', lecturer: a.lecturer ? a.lecturer.full_name : '' },
        entry_b: { id: b.id, room: b.room ? b.room.name : '', lecturer: b.lecturer ? b.lecturer.full_name : '' },
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const clashBodyRules = [
  body('course_1_code').trim().notEmpty().withMessage('course_1_code is required'),
  body('course_2_code').trim().notEmpty().withMessage('course_2_code is required'),
  body('day_of_week').notEmpty().withMessage('day_of_week is required'),
  body('time_range').trim().notEmpty().withMessage('time_range is required'),
];

// POST /api/clashes/resolve-detected  — create + resolve a clash that had no prior report
router.post('/resolve-detected', requireAuth, requireRole('lecturer'), clashBodyRules, validate, async (req, res) => {
  try {
    const { course_1_code, course_2_code, day_of_week, time_range, resolution_note } = req.body;
    if (!course_1_code || !course_2_code || !day_of_week || !time_range)
      return res.status(400).json({ error: 'course_1_code, course_2_code, day_of_week and time_range are required' });

    const { data, error } = await supabase
      .from('clash_reports')
      .insert({
        reported_by:     req.user.id,
        course_1_code,
        course_2_code,
        day_of_week:     Number(day_of_week),
        time_range,
        description:     'Auto-detected schedule conflict.',
        status:          'resolved',
        resolution_note: resolution_note || 'Clash resolved by lecturer.',
        resolved_by:     req.user.id,
        resolved_at:     new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) throw error;
    res.json({ id: data.id, status: 'resolved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clashes/stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('clash_reports').select('status');
    if (error) throw error;
    const total    = data.length;
    const pending  = data.filter(c => c.status === 'pending').length;
    const resolved = data.filter(c => c.status === 'resolved').length;
    res.json({ total, pending, resolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clashes
router.get('/', requireAuth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    let q = supabase.from('clash_reports').select(FULL_SELECT)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (req.query.status) q = q.eq('status', req.query.status);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data.map(c => ({ ...c, day: NUM_TO_DAY[c.day_of_week] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clashes/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('clash_reports').select(FULL_SELECT).eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Clash not found' });
    res.json({ ...data, day: NUM_TO_DAY[data.day_of_week] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clashes
router.post('/', requireAuth, clashBodyRules, validate, async (req, res) => {
  try {
    let { course_1_code, course_2_code, day_of_week, time_range, description } = req.body;
    if (!course_1_code || !course_2_code || !day_of_week || !time_range)
      return res.status(400).json({ error: 'course_1_code, course_2_code, day_of_week and time_range are required' });
    if (typeof day_of_week === 'string' && isNaN(day_of_week)) {
      day_of_week = DAY_TO_NUM[day_of_week];
      if (!day_of_week) return res.status(400).json({ error: 'Invalid day name' });
    }
    const { data, error } = await supabase
      .from('clash_reports')
      .insert({ reported_by: req.user.id, course_1_code, course_2_code, day_of_week: Number(day_of_week), time_range, description: description || '', status: 'pending' })
      .select(FULL_SELECT).single();
    if (error) throw error;
    res.status(201).json({ ...data, day: NUM_TO_DAY[data.day_of_week] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clashes/:id/resolve
router.put('/:id/resolve', requireAuth, requireRole('lecturer'), async (req, res) => {
  try {
    const { data: existing, error: fetchErr } = await supabase.from('clash_reports').select('id, status').eq('id', req.params.id).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: 'Clash not found' });
    if (existing.status === 'resolved') return res.status(400).json({ error: 'Already resolved' });

    const { data, error } = await supabase
      .from('clash_reports')
      .update({ status: 'resolved', resolution_note: req.body.resolution_note || 'Clash resolved.', resolved_by: req.user.id, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select(FULL_SELECT).single();
    if (error) throw error;
    res.json({ ...data, day: NUM_TO_DAY[data.day_of_week] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clashes/:id
router.delete('/:id', requireAuth, requireRole('lecturer'), async (req, res) => {
  try {
    const { error } = await supabase.from('clash_reports').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Clash deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
