const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fullstack_app'
};

// Get all users (protected route)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, name, email, created_at FROM users');
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
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
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

// Create new user (protected route)
router.post('/', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, password } = req.body;
    
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
    
    // Insert new user
    const [result] = await connection.execute(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, password] // In production, hash the password
    );
    
    await connection.end();
    
    res.status(201).json({
      id: result.insertId,
      name,
      email,
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
  body('email').optional().isEmail().withMessage('Valid email is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email } = req.body;
    const userId = req.params.id;
    
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?',
      [name, email, userId]
    );
    
    await connection.end();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (protected route)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      'DELETE FROM users WHERE id = ?',
      [req.params.id]
    );
    
    await connection.end();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
