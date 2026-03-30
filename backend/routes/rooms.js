const router   = require('express').Router();
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');

// GET /api/rooms
router.get('/', requireAuth, async (req, res) => {
  try {
    let query = supabase
      .from('rooms')
      .select('id, name, building, capacity, is_lab')
      .order('name');
    if (req.query.is_lab !== undefined) query = query.eq('is_lab', req.query.is_lab === 'true');
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, name, building, capacity, is_lab')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Room not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
