const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { body, validationResult } = require('express-validator');

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hotel_management'
};

// Validation middleware
const validateRoomType = [
  body('type_name').trim().notEmpty().withMessage('Type name is required')
    .isLength({ max: 100 }).withMessage('Type name must be less than 100 characters'),
  body('description').optional().trim(),
  body('max_occupancy').optional().isInt({ min: 1, max: 10 }).withMessage('Max occupancy must be between 1 and 10')
];

// GET all room types
router.get('/', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      'SELECT * FROM RoomTypes ORDER BY created_at DESC'
    );
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching room types:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET single room type by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      'SELECT * FROM RoomTypes WHERE room_type_id = ?',
      [id]
    );
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room type not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching room type:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST create new room type
router.post('/', validateRoomType, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type_name, description, max_occupancy = 2 } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(
      'INSERT INTO RoomTypes (type_name, description, max_occupancy) VALUES (?, ?, ?)',
      [type_name, description, max_occupancy]
    );
    
    const [newRoomType] = await connection.execute(
      'SELECT * FROM RoomTypes WHERE room_type_id = ?',
      [result.insertId]
    );
    
    await connection.end();
    
    res.status(201).json({
      success: true,
      message: 'Room type created successfully',
      data: newRoomType[0]
    });
  } catch (error) {
    console.error('Error creating room type:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT update room type
router.put('/:id', validateRoomType, async (req, res) => {
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
    const { type_name, description, max_occupancy = 2 } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if room type exists
    const [existing] = await connection.execute(
      'SELECT * FROM RoomTypes WHERE room_type_id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Room type not found'
      });
    }
    
    await connection.execute(
      'UPDATE RoomTypes SET type_name = ?, description = ?, max_occupancy = ? WHERE room_type_id = ?',
      [type_name, description, max_occupancy, id]
    );
    
    const [updatedRoomType] = await connection.execute(
      'SELECT * FROM RoomTypes WHERE room_type_id = ?',
      [id]
    );
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Room type updated successfully',
      data: updatedRoomType[0]
    });
  } catch (error) {
    console.error('Error updating room type:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE room type
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if room type exists
    const [existing] = await connection.execute(
      'SELECT * FROM RoomTypes WHERE room_type_id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Room type not found'
      });
    }
    
    await connection.execute(
      'DELETE FROM RoomTypes WHERE room_type_id = ?',
      [id]
    );
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Room type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting room type:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
