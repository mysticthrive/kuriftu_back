const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { body, validationResult } = require('express-validator');

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kuriftur_Hayle'
};

// Validation middleware
const validateRoom = [
  body('hotel').isIn(['africanVillage', 'bishoftu', 'entoto', 'laketana', 'awashfall']).withMessage('Invalid hotel selection'),
  body('room_number').isLength({ min: 1, max: 20 }).withMessage('Room number must be between 1 and 20 characters'),
  body('room_type_id').optional().isInt().withMessage('Room Type ID must be a valid integer'),
  body('room_group_id').optional().isInt().withMessage('Room Group ID must be a valid integer'),
  body('status').isIn(['available', 'occupied', 'maintenance', 'hold', 'booked']).withMessage('Invalid status')
];

// GET all rooms with room type and room group details
router.get('/', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        r.room_id,
        r.hotel,
        r.room_number,
        r.status,
        r.created_at,
        r.updated_at,
        rt.room_type_id,
        rt.type_name,
        rt.description as type_description,
        rt.max_occupancy,
        rg.room_group_id,
        rg.group_name,
        rg.description as group_description
      FROM Rooms r
      LEFT JOIN RoomTypes rt ON r.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON r.room_group_id = rg.room_group_id
      ORDER BY r.hotel, r.room_number
    `);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET room by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        r.room_id,
        r.hotel,
        r.room_number,
        r.status,
        r.created_at,
        r.updated_at,
        rt.room_type_id,
        rt.type_name,
        rt.description as type_description,
        rt.max_occupancy,
        rg.room_group_id,
        rg.group_name,
        rg.description as group_description
      FROM Rooms r
      LEFT JOIN RoomTypes rt ON r.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON r.room_group_id = rg.room_group_id
      WHERE r.room_id = ?
    `, [id]);
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET rooms by hotel
router.get('/hotel/:hotel', async (req, res) => {
  try {
    const { hotel } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        r.room_id,
        r.hotel,
        r.room_number,
        r.status,
        r.created_at,
        r.updated_at,
        rt.room_type_id,
        rt.type_name,
        rt.description as type_description,
        rt.max_occupancy,
        rg.room_group_id,
        rg.group_name,
        rg.description as group_description
      FROM Rooms r
      LEFT JOIN RoomTypes rt ON r.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON r.room_group_id = rg.room_group_id
      WHERE r.hotel = ?
      ORDER BY r.room_number
    `, [hotel]);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching rooms by hotel:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET available rooms
router.get('/status/available', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        r.room_id,
        r.hotel,
        r.room_number,
        r.status,
        r.created_at,
        r.updated_at,
        rt.room_type_id,
        rt.type_name,
        rt.description as type_description,
        rt.max_occupancy,
        rg.room_group_id,
        rg.group_name,
        rg.description as group_description
      FROM Rooms r
      LEFT JOIN RoomTypes rt ON r.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON r.room_group_id = rg.room_group_id
      WHERE r.status = 'available'
      ORDER BY r.hotel, r.room_number
    `);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST create new room
router.post('/', validateRoom, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { hotel, room_number, room_type_id, room_group_id, status } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if room already exists
    const [existing] = await connection.execute(
      'SELECT * FROM Rooms WHERE hotel = ? AND room_number = ?',
      [hotel, room_number]
    );
    
    if (existing.length > 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'Room already exists in this hotel'
      });
    }
    
    // Create room
    const [result] = await connection.execute(`
      INSERT INTO Rooms (hotel, room_number, room_type_id, room_group_id, status)
      VALUES (?, ?, ?, ?, ?)
    `, [hotel, room_number, room_type_id || null, room_group_id || null, status]);
    
    // Get the created room with details
    const [newRoom] = await connection.execute(`
      SELECT 
        r.room_id,
        r.hotel,
        r.room_number,
        r.status,
        r.created_at,
        r.updated_at,
        rt.room_type_id,
        rt.type_name,
        rt.description as type_description,
        rt.max_occupancy,
        rg.room_group_id,
        rg.group_name,
        rg.description as group_description
      FROM Rooms r
      LEFT JOIN RoomTypes rt ON r.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON r.room_group_id = rg.room_group_id
      WHERE r.room_id = ?
    `, [result.insertId]);
    
    await connection.end();
    
    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: newRoom[0]
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT update room
router.put('/:id', validateRoom, async (req, res) => {
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
    const { hotel, room_number, room_type_id, room_group_id, status } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if room exists
    const [existing] = await connection.execute('SELECT * FROM Rooms WHERE room_id = ?', [id]);
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if room number already exists in the same hotel (excluding current room)
    const [duplicate] = await connection.execute(
      'SELECT * FROM Rooms WHERE hotel = ? AND room_number = ? AND room_id != ?',
      [hotel, room_number, id]
    );
    
    if (duplicate.length > 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'Room number already exists in this hotel'
      });
    }
    
    // Update room
    await connection.execute(`
      UPDATE Rooms SET
        hotel = ?, room_number = ?, room_type_id = ?, room_group_id = ?, status = ?
        WHERE room_id = ?
    `, [hotel, room_number, room_type_id || null, room_group_id || null, status, id]);
    
    // Get the updated room with details
    const [updatedRoom] = await connection.execute(`
      SELECT 
        r.room_id,
        r.hotel,
        r.room_number,
        r.status,
        r.created_at,
        r.updated_at,
        rt.room_type_id,
        rt.type_name,
        rt.description as type_description,
        rt.max_occupancy,
        rg.room_group_id,
        rg.group_name,
        rg.description as group_description
      FROM Rooms r
      LEFT JOIN RoomTypes rt ON r.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON r.room_group_id = rg.room_group_id
      WHERE r.room_id = ?
    `, [id]);
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Room updated successfully',
      data: updatedRoom[0]
    });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE room
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if room exists
    const [existing] = await connection.execute('SELECT * FROM Rooms WHERE room_id = ?', [id]);
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if room has active reservations
    const [reservations] = await connection.execute(
      'SELECT COUNT(*) as count FROM Reservations WHERE room_id = ? AND status IN ("confirmed", "completed")',
      [id]
    );
    
    if (reservations[0].count > 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete room with active reservations'
      });
    }
    
    // Delete room
    await connection.execute('DELETE FROM Rooms WHERE room_id = ?', [id]);
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
