const router   = require('express').Router();
const { body, query } = require('express-validator');
const supabase = require('../supabase');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

const DAY_TO_NUM = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
const NUM_TO_DAY = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' };

const FULL_SELECT = `
  id, day_of_week, start_time, end_time, status, group_number, created_at, updated_at,
  offering:course_offerings (
    id, academic_year, semester,
    course:courses ( id, code, title, credit_hours, level, department_id )
  ),
  room:rooms ( id, name, building, is_lab ),
  lecturer:users!lecturer_id ( id, full_name, email )
`;

async function detectClashes(day_of_week, start_time, end_time, room_id, lecturer_id, excludeId = null) {
  const conflicts = [];

  let roomQuery = supabase
    .from('timetable_entries')
    .select('id, start_time, end_time, room:rooms(name), offering:course_offerings(course:courses(title))')
    .eq('day_of_week', day_of_week)
    .eq('room_id', room_id)
    .lt('start_time', end_time)
    .gt('end_time', start_time);
  if (excludeId) roomQuery = roomQuery.neq('id', excludeId);
  const { data: roomClashes } = await roomQuery;
  if (roomClashes && roomClashes.length) {
    roomClashes.forEach(c => {
      conflicts.push({ type: 'room', message: `Room is already booked for ${c.offering?.course?.title || 'another class'} from ${c.start_time} to ${c.end_time} on ${NUM_TO_DAY[day_of_week]}` });
    });
  }

  let lecQuery = supabase
    .from('timetable_entries')
    .select('id, start_time, end_time, offering:course_offerings(course:courses(title))')
    .eq('day_of_week', day_of_week)
    .eq('lecturer_id', lecturer_id)
    .lt('start_time', end_time)
    .gt('end_time', start_time);
  if (excludeId) lecQuery = lecQuery.neq('id', excludeId);
  const { data: lecClashes } = await lecQuery;
  if (lecClashes && lecClashes.length) {
    lecClashes.forEach(c => {
      conflicts.push({ type: 'lecturer', message: `You are already scheduled to teach ${c.offering?.course?.title || 'another class'} from ${c.start_time} to ${c.end_time} on ${NUM_TO_DAY[day_of_week]}` });
    });
  }

  return conflicts;
}

async function notifyAllStudents(title, message) {
  const { data: students } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'student');
  if (!students || !students.length) return;
  const notifications = students.map(s => ({
    user_id: s.id, title, message, type: 'schedule_change', is_read: false,
  }));
  await supabase.from('notifications').insert(notifications);
}

// GET /api/timetable
router.get('/', requireAuth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 100));
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    let q = supabase
      .from('timetable_entries')
      .select(FULL_SELECT)
      .order('day_of_week')
      .order('start_time')
      .range(from, to);
    if (req.query.day) {
      const dayNum = DAY_TO_NUM[req.query.day];
      if (!dayNum) return res.status(400).json({ error: 'Invalid day. Use Monday-Sunday.' });
      q = q.eq('day_of_week', dayNum);
    }
    const { data, error } = await q;
    if (error) throw error;
    res.json(data.map(e => ({ ...e, day: NUM_TO_DAY[e.day_of_week] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timetable/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('timetable_entries')
      .select(FULL_SELECT)
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Entry not found' });
    res.json({ ...data, day: NUM_TO_DAY[data.day_of_week] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const timetableBodyRules = [
  body('offering_id').notEmpty().withMessage('offering_id is required'),
  body('room_id').notEmpty().withMessage('room_id is required'),
  body('day_of_week').notEmpty().withMessage('day_of_week is required'),
  body('start_time').matches(TIME_RE).withMessage('start_time must be in HH:MM format'),
  body('end_time').matches(TIME_RE).withMessage('end_time must be in HH:MM format'),
  body('end_time').custom((val, { req }) => {
    if (val && req.body.start_time && val <= req.body.start_time)
      throw new Error('end_time must be after start_time');
    return true;
  }),
  body('group_number').optional().isInt({ min: 1 }).withMessage('group_number must be a positive integer'),
];

// POST /api/timetable
router.post('/', requireAuth, requireRole('lecturer'), timetableBodyRules, validate, async (req, res) => {
  try {
    let { offering_id, room_id, day_of_week, start_time, end_time, group_number } = req.body;
    if (!offering_id || !room_id || !day_of_week || !start_time || !end_time)
      return res.status(400).json({ error: 'offering_id, room_id, day_of_week, start_time and end_time are required' });

    if (typeof day_of_week === 'string' && isNaN(day_of_week)) {
      day_of_week = DAY_TO_NUM[day_of_week];
      if (!day_of_week) return res.status(400).json({ error: 'Invalid day name' });
    }
    day_of_week = Number(day_of_week);

    const lecturer_id = req.user.id;

    const { data: existingEntry } = await supabase
      .from('timetable_entries')
      .select('id')
      .eq('lecturer_id', lecturer_id)
      .eq('offering_id', offering_id)
      .limit(1)
      .maybeSingle();
    if (!existingEntry) {
      return res.status(403).json({ error: 'You can only add schedules for courses you already teach' });
    }

    const conflicts = await detectClashes(day_of_week, start_time, end_time, room_id, lecturer_id);
    if (conflicts.length > 0)
      return res.status(409).json({ error: 'Schedule conflict detected', conflicts });

    const { data, error } = await supabase
      .from('timetable_entries')
      .insert({ offering_id, room_id, lecturer_id, day_of_week, start_time, end_time, group_number: group_number != null ? group_number : null, created_by: req.user.id })
      .select(FULL_SELECT)
      .single();
    if (error) throw error;

    const dayName = NUM_TO_DAY[data.day_of_week];
    await notifyAllStudents('New Class Scheduled',
      `A new ${data.offering?.course?.title || 'class'} has been scheduled for ${dayName} ${start_time}-${end_time} in ${data.room?.name || 'TBD'}.`);

    const { data: overlapping } = await supabase
      .from('timetable_entries')
      .select('id, offering:course_offerings(course:courses(title))')
      .eq('day_of_week', data.day_of_week)
      .lt('start_time', data.end_time)
      .gt('end_time', data.start_time)
      .neq('id', data.id);
    const warnings = (overlapping || []).map(o => ({
      type: 'student_conflict',
      message: `${o.offering?.course?.title || 'Another class'} is already scheduled at this time. Students taking both courses will have a conflict.`,
    }));

    res.status(201).json({ ...data, day: dayName, warnings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const timetableUpdateRules = [
  body('start_time').optional().matches(TIME_RE).withMessage('start_time must be in HH:MM format'),
  body('end_time').optional().matches(TIME_RE).withMessage('end_time must be in HH:MM format'),
  body('end_time').optional().custom((val, { req }) => {
    const start = req.body.start_time;
    if (val && start && val <= start) throw new Error('end_time must be after start_time');
    return true;
  }),
  body('group_number').optional().isInt({ min: 1 }).withMessage('group_number must be a positive integer'),
];

// PUT /api/timetable/:id
router.put('/:id', requireAuth, requireRole('lecturer'), timetableUpdateRules, validate, async (req, res) => {
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('timetable_entries')
      .select('id, lecturer_id, offering_id, day_of_week, start_time, end_time, room_id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: 'Entry not found' });
    if (existing.lecturer_id !== req.user.id)
      return res.status(403).json({ error: 'You can only modify your own timetable entries' });

    const { offering_id, room_id, start_time, end_time, group_number } = req.body;
    let { day_of_week } = req.body;
    const patch = {};
    if (offering_id) patch.offering_id = offering_id;
    if (room_id)     patch.room_id     = room_id;
    if (start_time)  patch.start_time  = start_time;
    if (end_time)    patch.end_time    = end_time;
    if ('group_number' in req.body) patch.group_number = group_number != null ? group_number : null;
    if (day_of_week !== undefined) {
      if (typeof day_of_week === 'string' && isNaN(day_of_week))
        day_of_week = DAY_TO_NUM[day_of_week];
      patch.day_of_week = Number(day_of_week);
    }
    if (Object.keys(patch).length === 0)
      return res.status(400).json({ error: 'Nothing to update' });

    const checkDay   = patch.day_of_week != null ? patch.day_of_week : existing.day_of_week;
    const checkStart = patch.start_time  || existing.start_time;
    const checkEnd   = patch.end_time    || existing.end_time;
    const checkRoom  = patch.room_id     || existing.room_id;

    const conflicts = await detectClashes(checkDay, checkStart, checkEnd, checkRoom, existing.lecturer_id, req.params.id);
    if (conflicts.length > 0)
      return res.status(409).json({ error: 'Schedule conflict detected', conflicts });

    const timeChanging =
      (patch.day_of_week !== undefined && patch.day_of_week !== existing.day_of_week) ||
      (patch.start_time  !== undefined && patch.start_time  !== existing.start_time)  ||
      (patch.end_time    !== undefined && patch.end_time    !== existing.end_time);

    if (timeChanging) {
      const { data: studentConflicts } = await supabase
        .from('timetable_entries')
        .select('id, offering:course_offerings(course:courses(title))')
        .eq('day_of_week', checkDay)
        .lt('start_time', checkEnd)
        .gt('end_time', checkStart)
        .neq('id', req.params.id);
      if (studentConflicts && studentConflicts.length > 0) {
        const clashList = studentConflicts.map(c => ({
          type: 'student_conflict',
          message: `${c.offering?.course?.title || 'Another class'} is already scheduled at this time. Moving here will create a student conflict.`,
        }));
        return res.status(409).json({ error: 'Schedule conflict detected', conflicts: clashList });
      }
    }

    patch.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('timetable_entries')
      .update(patch)
      .eq('id', req.params.id)
      .select(FULL_SELECT)
      .maybeSingle();
    if (error) throw error;

    const dayName = NUM_TO_DAY[data.day_of_week];
    await notifyAllStudents('Class Rescheduled',
      `${data.offering?.course?.title || 'A class'} on ${dayName} has been updated: ${checkStart}-${checkEnd} in ${data.room?.name || 'TBD'}.`);

    res.json({ ...data, day: dayName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/timetable/:id/cancel
router.put('/:id/cancel', requireAuth, requireRole('lecturer'), async (req, res) => {
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('timetable_entries')
      .select('id, lecturer_id, offering_id, day_of_week, start_time, end_time')
      .eq('id', req.params.id).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: 'Entry not found' });
    if (existing.lecturer_id !== req.user.id)
      return res.status(403).json({ error: 'You can only cancel your own classes' });

    const { data, error } = await supabase
      .from('timetable_entries')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select(FULL_SELECT).single();
    if (error) throw error;

    const dayName = NUM_TO_DAY[existing.day_of_week];
    await notifyAllStudents('Class Cancelled',
      `${data.offering?.course?.title || 'A class'} on ${dayName} at ${existing.start_time}-${existing.end_time} has been cancelled.`);

    res.json({ ...data, day: dayName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/timetable/:id/restore
router.put('/:id/restore', requireAuth, requireRole('lecturer'), async (req, res) => {
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('timetable_entries')
      .select('id, lecturer_id, offering_id, day_of_week, start_time, end_time')
      .eq('id', req.params.id).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!existing) return res.status(404).json({ error: 'Entry not found' });
    if (existing.lecturer_id !== req.user.id)
      return res.status(403).json({ error: 'You can only restore your own classes' });

    const { data, error } = await supabase
      .from('timetable_entries')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select(FULL_SELECT).single();
    if (error) throw error;

    const dayName = NUM_TO_DAY[existing.day_of_week];
    await notifyAllStudents('Class Restored',
      `${data.offering?.course?.title || 'A class'} on ${dayName} at ${existing.start_time}-${existing.end_time} has been restored.`);

    res.json({ ...data, day: dayName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/timetable/:id
router.delete('/:id', requireAuth, requireRole('lecturer'), async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('timetable_entries').select('id, lecturer_id').eq('id', req.params.id).maybeSingle();
    if (!existing) return res.status(404).json({ error: 'Entry not found' });
    if (existing.lecturer_id !== req.user.id)
      return res.status(403).json({ error: 'You can only delete your own entries' });
    const { error } = await supabase.from('timetable_entries').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
