const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fullstack_app'
};

// Available roles
const AVAILABLE_ROLES = ['Admin', 'Reservation Officer', 'Sales Manager', 'Front Office Manager'];

// Get all users (protected route)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.updated_at 
      FROM users u 
      ORDER BY u.created_at DESC
    `);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID (protected route)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = ?',
      [req.params.id]
    );
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get available roles
router.get('/roles/available', authenticateToken, async (req, res) => {
  try {
    res.json(AVAILABLE_ROLES);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Create new user (protected route)
router.post('/', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(AVAILABLE_ROLES).withMessage('Invalid role')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, password, role } = req.body;
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      await connection.end();
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insert new user
    const [result] = await connection.execute(
      'INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, true]
    );
    
    await connection.end();
    
    res.status(201).json({
      id: result.insertId,
      name,
      email,
      role,
      is_active: true,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (protected route)
router.put('/:id', authenticateToken, [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(AVAILABLE_ROLES).withMessage('Invalid role'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, role, is_active } = req.body;
    const userId = req.params.id;
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if user exists
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );
    
    if (existingUser.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if email is being updated and if it already exists
    if (email) {
      const [emailCheck] = await connection.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      
      if (emailCheck.length > 0) {
        await connection.end();
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    
    const [result] = await connection.execute(
      'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), is_active = COALESCE(?, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, email, role, is_active, userId]
    );
    
    await connection.end();
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update user password (protected route)
router.put('/:id/password', authenticateToken, [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { password } = req.body;
    const userId = req.params.id;
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if user exists
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );
    
    if (existingUser.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const [result] = await connection.execute(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]
    );
    
    await connection.end();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Delete user (protected route)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if user exists
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (existingUser.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'User not found' });
    }
    
    const [result] = await connection.execute(
      'DELETE FROM users WHERE id = ?',
      [req.params.id]
    );
    
    await connection.end();
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
