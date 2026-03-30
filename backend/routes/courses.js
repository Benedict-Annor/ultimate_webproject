const router   = require('express').Router();
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/courses
router.get('/', requireAuth, async (req, res) => {
  try {
    let query = supabase
      .from('courses')
      .select('id, code, title, credit_hours, level, department_id')
      .order('code');
    if (req.query.department_id) query = query.eq('department_id', req.query.department_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/courses/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('id, code, title, credit_hours, level, department_id')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Course not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
