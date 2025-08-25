const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mysql = require('mysql2/promise');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kuriftur_Hayle'
};

// Validation middleware
const validateGiftCard = [
  body('card_type').isIn(['eCard', 'physical']).withMessage('Card type must be eCard or physical'),
  body('initial_amount').isFloat({ min: 0 }).withMessage('Initial amount must be a positive number'),
  body('issued_to_guest_id').optional().isInt().withMessage('Guest ID must be an integer'),
  body('expiry_date').optional().isISO8601().withMessage('Expiry date must be a valid date'),
  body('status').optional().isIn(['active', 'redeemed', 'expired', 'cancelled']).withMessage('Invalid status'),
  body('payment_status').optional().isIn(['pending', 'completed', 'failed', 'refunded', 'cancelled']).withMessage('Invalid payment status'),
  body('notes').optional().isString().withMessage('Notes must be a string')
];

// Generate unique card code
const generateCardCode = () => {
  return 'GC-' + crypto.randomBytes(8).toString('hex').toUpperCase();
};

// Get all gift cards
router.get('/', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [giftCards] = await connection.execute(
      `SELECT 
        g.*,
        guest.first_name as guest_name,
        guest.email as guest_email
       FROM GiftCards g
       LEFT JOIN guests guest ON g.issued_to_guest_id = guest.guest_id
       WHERE g.deleted_at IS NULL
       ORDER BY g.created_at DESC`
    );
    
    await connection.end();
    
    res.json({
      success: true,
      data: giftCards
    });
  } catch (error) {
    console.error('Error fetching gift cards:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get gift cards with pagination and filtering
router.get('/filter', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', card_type = '' } = req.query;
    const offset = (page - 1) * limit;
    const connection = await mysql.createConnection(dbConfig);

    // Build WHERE clause
    let whereClause = 'WHERE g.deleted_at IS NULL';
    const params = [];

    if (search) {
      whereClause += ' AND (g.card_code LIKE ? OR g.notes LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND g.status = ?';
      params.push(status);
    }

    if (card_type) {
      whereClause += ' AND g.card_type = ?';
      params.push(card_type);
    }

    // Get total count
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM GiftCards g ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get gift cards with guest information
    const [giftCards] = await connection.execute(
      `SELECT 
        g.*,
        guest.first_name as guest_name,
        guest.email as guest_email
       FROM GiftCards g
       LEFT JOIN guests guest ON g.issued_to_guest_id = guest.guest_id
       ${whereClause}
       ORDER BY g.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    await connection.end();

    res.json({
      success: true,
      data: giftCards,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching gift cards with filters:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get gift card by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);

    const [giftCards] = await connection.execute(
      `SELECT 
        g.*,
        guest.first_name as guest_name,
        guest.email as guest_email
       FROM GiftCards g
       LEFT JOIN guests guest ON g.issued_to_guest_id = guest.guest_id
       WHERE g.gift_card_id = ? AND g.deleted_at IS NULL`,
      [id]
    );

    if (giftCards.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Gift card not found'
      });
    }

    await connection.end();

    res.json({
      success: true,
      data: giftCards[0]
    });
  } catch (error) {
    console.error('Error fetching gift card:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create new gift card
router.post('/', authenticateToken, validateGiftCard, async (req, res) => {
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
      card_type,
      initial_amount,
      issued_to_guest_id,
      expiry_date,
      status = 'active',
      payment_status = 'pending',
      notes
    } = req.body;

    const connection = await mysql.createConnection(dbConfig);

    // Generate unique card code
    let cardCode;
    let isUnique = false;
    while (!isUnique) {
      cardCode = generateCardCode();
      const [existing] = await connection.execute(
        'SELECT gift_card_id FROM GiftCards WHERE card_code = ?',
        [cardCode]
      );
      if (existing.length === 0) {
        isUnique = true;
      }
    }

    // Insert new gift card
    const [result] = await connection.execute(
      `INSERT INTO GiftCards (
        card_code, card_type, initial_amount, current_balance,
        issued_to_guest_id, expiry_date, status, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cardCode,
        card_type,
        initial_amount,
        initial_amount, // current_balance starts equal to initial_amount
        issued_to_guest_id || null,
        expiry_date || null,
        status,
        payment_status,
        notes || null
      ]
    );

    // Get the created gift card
    const [giftCards] = await connection.execute(
      `SELECT 
        g.*,
        guest.first_name as guest_name,
        guest.email as guest_email
       FROM GiftCards g
       LEFT JOIN guests guest ON g.issued_to_guest_id = guest.guest_id
       WHERE g.gift_card_id = ?`,
      [result.insertId]
    );

    await connection.end();

    res.status(201).json({
      success: true,
      message: 'Gift card created successfully',
      data: giftCards[0]
    });
  } catch (error) {
    console.error('Error creating gift card:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update gift card
router.put('/:id', authenticateToken, validateGiftCard, async (req, res) => {
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
      card_type,
      initial_amount,
      current_balance,
      issued_to_guest_id,
      expiry_date,
      status,
      payment_status,
      notes
    } = req.body;

    const connection = await mysql.createConnection(dbConfig);

    // Check if gift card exists
    const [existing] = await connection.execute(
      'SELECT gift_card_id FROM GiftCards WHERE gift_card_id = ? AND deleted_at IS NULL',
      [id]
    );

    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Gift card not found'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (card_type !== undefined) {
      updateFields.push('card_type = ?');
      updateValues.push(card_type);
    }

    if (initial_amount !== undefined) {
      updateFields.push('initial_amount = ?');
      updateValues.push(initial_amount);
    }

    if (current_balance !== undefined) {
      updateFields.push('current_balance = ?');
      updateValues.push(current_balance);
    }

    if (issued_to_guest_id !== undefined) {
      updateFields.push('issued_to_guest_id = ?');
      updateValues.push(issued_to_guest_id || null);
    }

    if (expiry_date !== undefined) {
      updateFields.push('expiry_date = ?');
      updateValues.push(expiry_date || null);
    }

    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (payment_status !== undefined) {
      updateFields.push('payment_status = ?');
      updateValues.push(payment_status);
    }

    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes || null);
    }

    if (updateFields.length === 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Update gift card
    await connection.execute(
      `UPDATE GiftCards SET ${updateFields.join(', ')} WHERE gift_card_id = ?`,
      [...updateValues, id]
    );

    // Get updated gift card
    const [giftCards] = await connection.execute(
      `SELECT 
        g.*,
        guest.first_name as guest_name,
        guest.email as guest_email
       FROM GiftCards g
       LEFT JOIN guests guest ON g.issued_to_guest_id = guest.guest_id
       WHERE g.gift_card_id = ?`,
      [id]
    );

    await connection.end();

    res.json({
      success: true,
      message: 'Gift card updated successfully',
      data: giftCards[0]
    });
  } catch (error) {
    console.error('Error updating gift card:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete gift card (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);

    // Check if gift card exists
    const [existing] = await connection.execute(
      'SELECT gift_card_id FROM GiftCards WHERE gift_card_id = ? AND deleted_at IS NULL',
      [id]
    );

    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Gift card not found'
      });
    }

    // Soft delete
    await connection.execute(
      'UPDATE GiftCards SET deleted_at = CURRENT_TIMESTAMP WHERE gift_card_id = ?',
      [id]
    );

    await connection.end();

    res.json({
      success: true,
      message: 'Gift card deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting gift card:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get gift card by card code
router.get('/code/:cardCode', authenticateToken, async (req, res) => {
  try {
    const { cardCode } = req.params;
    const connection = await mysql.createConnection(dbConfig);

    const [giftCards] = await connection.execute(
      `SELECT 
        g.*,
        guest.first_name as guest_name,
        guest.email as guest_email
       FROM GiftCards g
       LEFT JOIN guests guest ON g.issued_to_guest_id = guest.guest_id
       WHERE g.card_code = ? AND g.deleted_at IS NULL`,
      [cardCode]
    );

    if (giftCards.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Gift card not found'
      });
    }

    await connection.end();

    res.json({
      success: true,
      data: giftCards[0]
    });
  } catch (error) {
    console.error('Error fetching gift card by code:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
