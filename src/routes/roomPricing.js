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
const validateRoomPricing = [
  body('room_group_room_type_id').isInt().withMessage('Room Group Room Type ID must be a valid integer'),
  body('hotel').isIn(['africanVillage', 'bishoftu', 'entoto', 'laketana', 'awashfall']).withMessage('Hotel must be one of the valid options'),
  body('occupancy').isIn(['single', 'double', 'triple', 'child']).withMessage('Occupancy must be single, double, triple, or child'),
  body('day_of_week').optional().isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).withMessage('Day of week must be a valid day'),
  body('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('holiday_flag').optional().isBoolean().withMessage('Holiday flag must be a boolean value'),
  body('start_date').optional().isISO8601().withMessage('Start date must be a valid date'),
  body('end_date').optional().isISO8601().withMessage('End date must be a valid date'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
];

// GET all room pricing with relationship details
router.get('/', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        rp.pricing_id,
        rp.room_group_room_type_id,
        rp.hotel,
        rp.occupancy,
        rp.day_of_week,
        rp.month,
        rp.holiday_flag,
        rp.start_date,
        rp.end_date,
        rp.price,
        rp.created_at,
        rg.group_name,
        rt.type_name
      FROM RoomPricing rp
      JOIN RoomGroupRoomType rgr ON rp.room_group_room_type_id = rgr.id
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      ORDER BY rg.group_name, rt.type_name, rp.created_at DESC
    `);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching room pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET room pricing by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        rp.pricing_id,
        rp.room_group_room_type_id,
        rp.hotel,
        rp.occupancy,
        rp.day_of_week,
        rp.month,
        rp.holiday_flag,
        rp.start_date,
        rp.end_date,
        rp.price,
        rp.created_at,
        rg.group_name,
        rt.type_name
      FROM RoomPricing rp
      JOIN RoomGroupRoomType rgr ON rp.room_group_room_type_id = rgr.id
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      WHERE rp.pricing_id = ?
    `, [id]);
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room pricing not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching room pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET pricing by room group room type ID
router.get('/relationship/:relationshipId', authenticateToken, async (req, res) => {
  try {
    const { relationshipId } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        rp.pricing_id,
        rp.room_group_room_type_id,
        rp.hotel,
        rp.occupancy,
        rp.day_of_week,
        rp.month,
        rp.holiday_flag,
        rp.start_date,
        rp.end_date,
        rp.price,
        rp.created_at,
        rg.group_name,
        rt.type_name
      FROM RoomPricing rp
      JOIN RoomGroupRoomType rgr ON rp.room_group_room_type_id = rgr.id
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      WHERE rp.room_group_room_type_id = ?
      ORDER BY rp.created_at DESC
    `, [relationshipId]);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching room pricing by relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET pricing by hotel
router.get('/hotel/:hotel', authenticateToken, async (req, res) => {
  try {
    const { hotel } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        rp.pricing_id,
        rp.room_group_room_type_id,
        rp.hotel,
        rp.occupancy,
        rp.day_of_week,
        rp.month,
        rp.holiday_flag,
        rp.start_date,
        rp.end_date,
        rp.price,
        rp.created_at,
        rg.group_name,
        rt.type_name
      FROM RoomPricing rp
      JOIN RoomGroupRoomType rgr ON rp.room_group_room_type_id = rgr.id
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      WHERE rp.hotel = ?
      ORDER BY rg.group_name, rt.type_name, rp.created_at DESC
    `, [hotel]);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching room pricing by hotel:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET pricing by occupancy
router.get('/occupancy/:occupancy', authenticateToken, async (req, res) => {
  try {
    const { occupancy } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        rp.pricing_id,
        rp.room_group_room_type_id,
        rp.hotel,
        rp.occupancy,
        rp.day_of_week,
        rp.month,
        rp.holiday_flag,
        rp.start_date,
        rp.end_date,
        rp.price,
        rp.created_at,
        rg.group_name,
        rt.type_name
      FROM RoomPricing rp
      JOIN RoomGroupRoomType rgr ON rp.room_group_room_type_id = rgr.id
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      WHERE rp.occupancy = ?
      ORDER BY rg.group_name, rt.type_name, rp.created_at DESC
    `, [occupancy]);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching room pricing by occupancy:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET pricing with filters
router.get('/filter', authenticateToken, async (req, res) => {
  try {
    const { hotel, occupancy, day_of_week, month, holiday_flag, start_date, end_date } = req.query;
    const connection = await mysql.createConnection(dbConfig);
    
    let query = `
      SELECT 
        rp.pricing_id,
        rp.room_group_room_type_id,
        rp.hotel,
        rp.occupancy,
        rp.day_of_week,
        rp.month,
        rp.holiday_flag,
        rp.start_date,
        rp.end_date,
        rp.price,
        rp.created_at,
        rg.group_name,
        rt.type_name
      FROM RoomPricing rp
      JOIN RoomGroupRoomType rgr ON rp.room_group_room_type_id = rgr.id
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (hotel) {
      query += ' AND rp.hotel = ?';
      params.push(hotel);
    }
    
    if (occupancy) {
      query += ' AND rp.occupancy = ?';
      params.push(occupancy);
    }
    
    if (day_of_week) {
      query += ' AND rp.day_of_week = ?';
      params.push(day_of_week);
    }
    
    if (month) {
      query += ' AND rp.month = ?';
      params.push(parseInt(month));
    }
    
    if (holiday_flag !== undefined) {
      query += ' AND rp.holiday_flag = ?';
      params.push(holiday_flag === 'true');
    }
    
    if (start_date) {
      query += ' AND rp.start_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND rp.end_date <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY rg.group_name, rt.type_name, rp.created_at DESC';
    
    const [rows] = await connection.execute(query, params);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching room pricing with filters:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST create new room pricing
router.post('/', authenticateToken, validateRoomPricing, async (req, res) => {
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
      room_group_room_type_id,
      hotel,
      occupancy,
      day_of_week,
      month,
      holiday_flag,
      start_date,
      end_date,
      price
    } = req.body;

    const connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(`
      INSERT INTO RoomPricing (
        room_group_room_type_id,
        hotel,
        occupancy,
        day_of_week,
        month,
        holiday_flag,
        start_date,
        end_date,
        price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      room_group_room_type_id,
      hotel,
      occupancy,
      day_of_week || null,
      month || null,
      holiday_flag || false,
      start_date || null,
      end_date || null,
      price
    ]);
    
    await connection.end();
    
    res.status(201).json({
      success: true,
      message: 'Room pricing created successfully',
      data: {
        pricing_id: result.insertId,
        room_group_room_type_id,
        hotel,
        occupancy,
        day_of_week,
        month,
        holiday_flag,
        start_date,
        end_date,
        price
      }
    });
  } catch (error) {
    console.error('Error creating room pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT update room pricing
router.put('/:id', authenticateToken, validateRoomPricing, async (req, res) => {
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
      room_group_room_type_id,
      hotel,
      occupancy,
      day_of_week,
      month,
      holiday_flag,
      start_date,
      end_date,
      price
    } = req.body;

    const connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(`
      UPDATE RoomPricing SET
        room_group_room_type_id = ?,
        hotel = ?,
        occupancy = ?,
        day_of_week = ?,
        month = ?,
        holiday_flag = ?,
        start_date = ?,
        end_date = ?,
        price = ?
      WHERE pricing_id = ?
    `, [
      room_group_room_type_id,
      hotel,
      occupancy,
      day_of_week || null,
      month || null,
      holiday_flag || false,
      start_date || null,
      end_date || null,
      price,
      id
    ]);
    
    await connection.end();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room pricing not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Room pricing updated successfully',
      data: {
        pricing_id: parseInt(id),
        room_group_room_type_id,
        hotel,
        occupancy,
        day_of_week,
        month,
        holiday_flag,
        start_date,
        end_date,
        price
      }
    });
  } catch (error) {
    console.error('Error updating room pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE room pricing
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(`
      DELETE FROM RoomPricing WHERE pricing_id = ?
    `, [id]);
    
    await connection.end();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room pricing not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Room pricing deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting room pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
