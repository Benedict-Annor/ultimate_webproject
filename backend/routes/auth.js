require('dotenv').config();
const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { body } = require('express-validator');
const supabase  = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const validate  = require('../middleware/validate');

const SECRET = process.env.JWT_SECRET;

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
], validate, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email and password are required' });

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, full_name, role, department_id, staff_id, student_id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) throw error;
    if (!user || !bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, email: user.email, full_name: user.full_name, role: user.role, department_id: user.department_id },
      SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, department_id, staff_id, student_id, created_at, departments(name)')
      .eq('id', req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'User not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { full_name, staff_id, student_id } = req.body;
    const patch = {};
    if (full_name)  patch.full_name  = full_name;
    if (staff_id)   patch.staff_id   = staff_id;
    if (student_id) patch.student_id = student_id;
    if (Object.keys(patch).length === 0)
      return res.status(400).json({ error: 'Nothing to update' });

    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', req.user.id)
      .select('id, email, full_name, role, department_id, staff_id, student_id')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/password
router.put('/password', requireAuth, [
  body('current_password').notEmpty().withMessage('current_password is required'),
  body('new_password').isLength({ min: 6 }).withMessage('new_password must be at least 6 characters'),
], validate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ error: 'current_password and new_password are required' });

    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .maybeSingle();

    if (!user || !bcrypt.compareSync(current_password, user.password_hash))
      return res.status(401).json({ error: 'Current password is incorrect' });

    const { error } = await supabase
      .from('users')
      .update({ password_hash: bcrypt.hashSync(new_password, 10) })
      .eq('id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
