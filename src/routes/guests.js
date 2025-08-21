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
  database: process.env.DB_NAME || 'hotel_management'
};

// Validation middleware
const validateGuest = [
  body('first_name').trim().notEmpty().withMessage('First name is required')
    .isLength({ max: 100 }).withMessage('First name must be less than 100 characters'),
  body('last_name').trim().notEmpty().withMessage('Last name is required')
    .isLength({ max: 100 }).withMessage('Last name must be less than 100 characters'),
  body('email').trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Email must be valid')
    .isLength({ max: 255 }).withMessage('Email must be less than 255 characters'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
  body('phone').optional().isLength({ max: 20 }).withMessage('Phone must be less than 20 characters'),
  body('country').optional().isLength({ max: 100 }).withMessage('Country must be less than 100 characters'),
  body('city').optional().isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
  body('zip_code').optional().isLength({ max: 20 }).withMessage('Zip code must be less than 20 characters'),
  body('address').optional().isLength({ max: 65535 }).withMessage('Address is too long'),
  body('date_of_birth').optional().isISO8601().withMessage('Date of birth must be a valid date')
];

// GET all guests
router.get('/', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      'SELECT * FROM Guests ORDER BY created_at DESC'
    );
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching guests:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET single guest by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      'SELECT * FROM Guests WHERE guest_id = ?',
      [id]
    );
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching guest:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST create new guest
router.post('/', authenticateToken, validateGuest, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      first_name,
      last_name,
      email,
      gender,
      phone,
      country,
      city,
      zip_code,
      address,
      date_of_birth
    } = req.body;

    const connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(
      `INSERT INTO Guests (first_name, last_name, email, gender, phone, country, city, zip_code, address, date_of_birth) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, gender, phone, country, city, zip_code, address, date_of_birth]
    );
    
    const [newGuest] = await connection.execute(
      'SELECT * FROM Guests WHERE guest_id = ?',
      [result.insertId]
    );
    
    await connection.end();
    
    res.status(201).json({
      success: true,
      message: 'Guest created successfully',
      data: newGuest[0]
    });
  } catch (error) {
    console.error('Error creating guest:', error);
    
    // Handle duplicate email error
    if (error.code === 'ER_DUP_ENTRY' && error.message.includes('email')) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT update guest
router.put('/:id', authenticateToken, validateGuest, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      gender,
      phone,
      country,
      city,
      zip_code,
      address,
      date_of_birth
    } = req.body;

    const connection = await mysql.createConnection(dbConfig);
    
    // Check if guest exists
    const [existing] = await connection.execute(
      'SELECT * FROM Guests WHERE guest_id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }
    
    // Check if email is already taken by another guest
    const [emailCheck] = await connection.execute(
      'SELECT guest_id FROM Guests WHERE email = ? AND guest_id != ?',
      [email, id]
    );
    
    if (emailCheck.length > 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    await connection.execute(
      `UPDATE Guests SET 
       first_name = ?, last_name = ?, email = ?, gender = ?, phone = ?, 
       country = ?, city = ?, zip_code = ?, address = ?, date_of_birth = ? 
       WHERE guest_id = ?`,
      [first_name, last_name, email, gender, phone, country, city, zip_code, address, date_of_birth, id]
    );
    
    const [updatedGuest] = await connection.execute(
      'SELECT * FROM Guests WHERE guest_id = ?',
      [id]
    );
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Guest updated successfully',
      data: updatedGuest[0]
    });
  } catch (error) {
    console.error('Error updating guest:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE guest
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if guest exists
    const [existing] = await connection.execute(
      'SELECT * FROM Guests WHERE guest_id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }
    
    await connection.execute(
      'DELETE FROM Guests WHERE guest_id = ?',
      [id]
    );
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Guest deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting guest:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
