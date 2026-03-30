const router   = require('express').Router();
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/offerings
// Returns all course_offerings with course details joined
router.get('/', requireAuth, async (req, res) => {
  try {
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
