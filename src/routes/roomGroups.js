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
const validateRoomGroup = [
  body('group_name').trim().notEmpty().withMessage('Group name is required')
    .isLength({ max: 100 }).withMessage('Group name must be less than 100 characters'),
  body('description').optional().trim(),
  body('hotel').notEmpty().withMessage('Hotel is required')
];

// GET all room groups
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { hotel } = req.query;
    const connection = await mysql.createConnection(dbConfig);
    
    let query = 'SELECT * FROM RoomGroups';
    let params = [];
    
    if (hotel) {
      query += ' WHERE hotel = ?';
      params.push(hotel);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await connection.execute(query, params);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching room groups:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET single room group by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      'SELECT * FROM RoomGroups WHERE room_group_id = ?',
      [id]
    );
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room group not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching room group:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST create new room group
router.post('/', authenticateToken, validateRoomGroup, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { group_name, description, hotel } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(
      'INSERT INTO RoomGroups (group_name, description, hotel) VALUES (?, ?, ?)',
      [group_name, description, hotel]
    );
    
    const [newRoomGroup] = await connection.execute(
      'SELECT * FROM RoomGroups WHERE room_group_id = ?',
      [result.insertId]
    );
    
    await connection.end();
    
    res.status(201).json({
      success: true,
      message: 'Room group created successfully',
      data: newRoomGroup[0]
    });
  } catch (error) {
    console.error('Error creating room group:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT update room group
router.put('/:id', authenticateToken, validateRoomGroup, async (req, res) => {
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
    const { group_name, description, hotel } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if room group exists
    const [existing] = await connection.execute(
      'SELECT * FROM RoomGroups WHERE room_group_id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Room group not found'
      });
    }
    
    await connection.execute(
      'UPDATE RoomGroups SET group_name = ?, description = ?, hotel = ? WHERE room_group_id = ?',
      [group_name, description, hotel, id]
    );
    
    const [updatedRoomGroup] = await connection.execute(
      'SELECT * FROM RoomGroups WHERE room_group_id = ?',
      [id]
    );
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Room group updated successfully',
      data: updatedRoomGroup[0]
    });
  } catch (error) {
    console.error('Error updating room group:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE room group
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if room group exists
    const [existing] = await connection.execute(
      'SELECT * FROM RoomGroups WHERE room_group_id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Room group not found'
      });
    }
    
    await connection.execute(
      'DELETE FROM RoomGroups WHERE room_group_id = ?',
      [id]
    );
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Room group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting room group:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
