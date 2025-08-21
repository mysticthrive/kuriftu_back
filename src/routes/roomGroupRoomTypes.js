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
const validateRoomGroupRoomType = [
  body('room_group_id').isInt().withMessage('Room Group ID must be a valid integer'),
  body('room_type_id').isInt().withMessage('Room Type ID must be a valid integer')
];

// GET all room group room type relationships
router.get('/', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        rgr.id,
        rgr.room_group_id,
        rgr.room_type_id,
        rgr.created_at,
        rgr.updated_at,
        rg.group_name,
        rg.description as group_description,
        rt.type_name,
        rt.description as type_description,
        rt.max_occupancy
      FROM RoomGroupRoomType rgr
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      ORDER BY rg.group_name, rt.type_name
    `);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching room group room types:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET room group room type by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        rgr.*,
        rg.group_name,
        rg.description as group_description,
        rt.type_name,
        rt.description as type_description,
        rt.max_occupancy
      FROM RoomGroupRoomType rgr
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      WHERE rgr.id = ?
    `, [id]);
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room Group Room Type relationship not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching room group room type:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET room types for a specific room group
router.get('/group/:roomGroupId', async (req, res) => {
  try {
    const { roomGroupId } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        rgr.id,
        rgr.room_type_id,
        rt.type_name,
        rt.description,
        rt.max_occupancy,
        rgr.created_at
      FROM RoomGroupRoomType rgr
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      WHERE rgr.room_group_id = ?
      ORDER BY rt.type_name
    `, [roomGroupId]);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching room types for room group:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET room groups for a specific room type
router.get('/type/:roomTypeId', async (req, res) => {
  try {
    const { roomTypeId } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        rgr.id,
        rgr.room_group_id,
        rg.group_name,
        rg.description,
        rgr.created_at
      FROM RoomGroupRoomType rgr
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      WHERE rgr.room_type_id = ?
      ORDER BY rg.group_name
    `, [roomTypeId]);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching room groups for room type:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST create new room group room type relationship
router.post('/', validateRoomGroupRoomType, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { room_group_id, room_type_id } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if relationship already exists
    const [existing] = await connection.execute(
      'SELECT * FROM RoomGroupRoomType WHERE room_group_id = ? AND room_type_id = ?',
      [room_group_id, room_type_id]
    );
    
    if (existing.length > 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'This room type is already assigned to this room group'
      });
    }
    
    // Create relationship
    const [result] = await connection.execute(`
      INSERT INTO RoomGroupRoomType (room_group_id, room_type_id)
      VALUES (?, ?)
    `, [room_group_id, room_type_id]);
    
    // Get the created relationship
    const [newRelationship] = await connection.execute(`
      SELECT 
        rgr.*,
        rg.group_name,
        rg.description as group_description,
        rt.type_name,
        rt.description as type_description,
        rt.max_occupancy
      FROM RoomGroupRoomType rgr
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      WHERE rgr.id = ?
    `, [result.insertId]);
    
    await connection.end();
    
    res.status(201).json({
      success: true,
      message: 'Room type successfully assigned to room group',
      data: newRelationship[0]
    });
  } catch (error) {
    console.error('Error creating room group room type relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE room group room type relationship
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if relationship exists
    const [existing] = await connection.execute(
      'SELECT * FROM RoomGroupRoomType WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Room Group Room Type relationship not found'
      });
    }
    
    // Delete relationship
    await connection.execute(
      'DELETE FROM RoomGroupRoomType WHERE id = ?',
      [id]
    );
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Room type successfully removed from room group'
    });
  } catch (error) {
    console.error('Error deleting room group room type relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST bulk assign room types to room group
router.post('/bulk-assign', async (req, res) => {
  try {
    const { room_group_id, room_type_ids } = req.body;
    
    if (!room_group_id || !Array.isArray(room_type_ids)) {
      return res.status(400).json({
        success: false,
        message: 'room_group_id and room_type_ids array are required'
      });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Start transaction
    await connection.beginTransaction();
    
    try {
      // Remove existing relationships for this room group
      await connection.execute(
        'DELETE FROM RoomGroupRoomType WHERE room_group_id = ?',
        [room_group_id]
      );
      
      // Insert new relationships
      for (const room_type_id of room_type_ids) {
        await connection.execute(`
          INSERT INTO RoomGroupRoomType (room_group_id, room_type_id)
          VALUES (?, ?)
        `, [room_group_id, room_type_id]);
      }
      
      await connection.commit();
      
      // Get updated relationships
      const [updatedRelationships] = await connection.execute(`
        SELECT 
          rgr.id,
          rgr.room_type_id,
          rt.type_name,
          rt.description,
          rt.max_occupancy
        FROM RoomGroupRoomType rgr
        JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
        WHERE rgr.room_group_id = ?
        ORDER BY rt.type_name
      `, [room_group_id]);
      
      await connection.end();
      
      res.json({
        success: true,
        message: 'Room types successfully assigned to room group',
        data: updatedRelationships
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error bulk assigning room types:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
