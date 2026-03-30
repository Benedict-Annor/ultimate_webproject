const router   = require('express').Router();
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/offerings
// Returns course_offerings with course details joined.
// ?my_courses=true  → only offerings the authenticated lecturer already teaches
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.query.my_courses === 'true' && req.user.role === 'lecturer') {
      const { data: myEntries, error: entErr } = await supabase
        .from('timetable_entries')
        .select('offering_id')
        .eq('lecturer_id', req.user.id);
      if (entErr) throw entErr;

      const offeringIds = [...new Set((myEntries || []).map(e => e.offering_id))];
      if (!offeringIds.length) return res.json([]);

      const { data, error } = await supabase
        .from('course_offerings')
        .select('id, academic_year, semester, course:courses( id, code, title, level, department_id )')
        .in('id', offeringIds)
        .order('id');
      if (error) throw error;
      return res.json(data);
    }

    let query = supabase
      .from('course_offerings')
      .select('id, academic_year, semester, course:courses( id, code, title, level, department_id )')
      .order('id');
    if (req.query.course_id) query = query.eq('course_id', req.query.course_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/offerings/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('course_offerings')
      .select('id, academic_year, semester, course:courses( id, code, title, level, department_id )')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Offering not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
