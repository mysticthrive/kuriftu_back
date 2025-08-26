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
  database: process.env.DB_NAME || 'kuriftur_Hayle'
};

// Validation middleware
const validatePromoCode = [
  body('code').trim().isLength({ min: 3, max: 50 }).withMessage('Code must be between 3 and 50 characters'),
  body('discount_type').isIn(['percentage', 'fixed_amount']).withMessage('Discount type must be percentage or fixed_amount'),
  body('discount_value').isFloat({ min: 0.01 }).withMessage('Discount value must be greater than 0'),
  body('valid_from').isISO8601().withMessage('Valid from must be a valid date'),
  body('valid_until').isISO8601().withMessage('Valid until must be a valid date')
];

// Get all promo codes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [promoCodes] = await connection.execute(`
      SELECT 
        pc.promo_code_id,
        pc.code,
        pc.description,
        pc.discount_type,
        pc.discount_value,
        pc.min_amount,
        pc.max_discount,
        pc.valid_from,
        pc.valid_until,
        pc.max_usage,
        pc.current_usage,
        pc.status,
        pc.created_at,
        pc.updated_at,
        u.name as created_by_name
      FROM promo_codes pc
      LEFT JOIN users u ON pc.created_by = u.id
      WHERE pc.deleted_at IS NULL
      ORDER BY pc.created_at DESC
    `);
    
    await connection.end();
    
    res.json({
      success: true,
      data: promoCodes
    });
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get single promo code by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [promoCodes] = await connection.execute(
      `SELECT 
        pc.promo_code_id,
        pc.code,
        pc.description,
        pc.discount_type,
        pc.discount_value,
        pc.min_amount,
        pc.max_discount,
        pc.valid_from,
        pc.valid_until,
        pc.max_usage,
        pc.current_usage,
        pc.status,
        pc.created_at,
        pc.updated_at,
        u.name as created_by_name
      FROM promo_codes pc
      LEFT JOIN users u ON pc.created_by = u.id
      WHERE pc.promo_code_id = ? AND pc.deleted_at IS NULL`,
      [id]
    );
    
    await connection.end();
    
    if (promoCodes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }
    
    res.json({
      success: true,
      data: promoCodes[0]
    });
  } catch (error) {
    console.error('Error fetching promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promo code',
      error: error.message
    });
  }
});

// Create new promo code
router.post('/', authenticateToken, validatePromoCode, async (req, res) => {
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
      code,
      description,
      discount_type,
      discount_value,
      min_amount = 0,
      max_discount,
      valid_from,
      valid_until,
      max_usage,
      status = 'active'
    } = req.body;
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if promo code already exists
    const [existingCodes] = await connection.execute(
      'SELECT promo_code_id FROM promo_codes WHERE code = ? AND deleted_at IS NULL',
      [code]
    );
    
    if (existingCodes.length > 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'Promo code already exists'
      });
    }
    
         // Insert new promo code
     const [result] = await connection.execute(
       `INSERT INTO promo_codes (
         code, description, discount_type, discount_value, min_amount, 
         max_discount, valid_from, valid_until, max_usage, status, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
       [
         code, 
         description || null, 
         discount_type, 
         discount_value, 
         min_amount || null,
         max_discount || null, 
         valid_from, 
         valid_until, 
         max_usage || null, 
         status, 
         req.user.id
       ]
     );
    
    const [newPromoCode] = await connection.execute(
      `SELECT 
        pc.promo_code_id,
        pc.code,
        pc.description,
        pc.discount_type,
        pc.discount_value,
        pc.min_amount,
        pc.max_discount,
        pc.valid_from,
        pc.valid_until,
        pc.max_usage,
        pc.current_usage,
        pc.status,
        pc.created_at,
        pc.updated_at,
        u.name as created_by_name
      FROM promo_codes pc
      LEFT JOIN users u ON pc.created_by = u.id
      WHERE pc.promo_code_id = ?`,
      [result.insertId]
    );
    
    await connection.end();
    
    res.status(201).json({
      success: true,
      message: 'Promo code created successfully',
      data: newPromoCode[0]
    });
  } catch (error) {
    console.error('Error creating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create promo code',
      error: error.message
    });
  }
});

// Update promo code
router.put('/:id', authenticateToken, validatePromoCode, async (req, res) => {
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
      code,
      description,
      discount_type,
      discount_value,
      min_amount = 0,
      max_discount,
      valid_from,
      valid_until,
      max_usage,
      status
    } = req.body;
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if promo code exists
    const [existingCodes] = await connection.execute(
      'SELECT promo_code_id FROM promo_codes WHERE promo_code_id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (existingCodes.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }
    
    // Check if code already exists (excluding current promo code)
    const [duplicateCodes] = await connection.execute(
      'SELECT promo_code_id FROM promo_codes WHERE code = ? AND promo_code_id != ? AND deleted_at IS NULL',
      [code, id]
    );
    
    if (duplicateCodes.length > 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'Promo code already exists'
      });
    }
    
         // Update promo code
     await connection.execute(
       `UPDATE promo_codes SET 
         code = ?, description = ?, discount_type = ?, discount_value = ?, 
         min_amount = ?, max_discount = ?, valid_from = ?, valid_until = ?, 
         max_usage = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE promo_code_id = ?`,
       [
         code, 
         description || null, 
         discount_type, 
         discount_value, 
         min_amount || null,
         max_discount || null, 
         valid_from, 
         valid_until, 
         max_usage || null, 
         status, 
         id
       ]
     );
    
    const [updatedPromoCode] = await connection.execute(
      `SELECT 
        pc.promo_code_id,
        pc.code,
        pc.description,
        pc.discount_type,
        pc.discount_value,
        pc.min_amount,
        pc.max_discount,
        pc.valid_from,
        pc.valid_until,
        pc.max_usage,
        pc.current_usage,
        pc.status,
        pc.created_at,
        pc.updated_at,
        u.name as created_by_name
      FROM promo_codes pc
      LEFT JOIN users u ON pc.created_by = u.id
      WHERE pc.promo_code_id = ?`,
      [id]
    );
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Promo code updated successfully',
      data: updatedPromoCode[0]
    });
  } catch (error) {
    console.error('Error updating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update promo code',
      error: error.message
    });
  }
});

// Delete promo code (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [existingCodes] = await connection.execute(
      'SELECT promo_code_id FROM promo_codes WHERE promo_code_id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (existingCodes.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }
    
    await connection.execute(
      'UPDATE promo_codes SET deleted_at = CURRENT_TIMESTAMP WHERE promo_code_id = ?',
      [id]
    );
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Promo code deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete promo code',
      error: error.message
    });
  }
});

module.exports = router;
