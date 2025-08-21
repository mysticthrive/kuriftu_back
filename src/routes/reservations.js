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
const validateReservation = [
  body('guest_id').isInt().withMessage('Guest ID must be a valid integer'),
  body('room_id').isInt().withMessage('Room ID must be a valid integer'),
  body('check_in_date').isISO8601().withMessage('Check-in date must be a valid date'),
  body('check_out_date').isISO8601().withMessage('Check-out date must be a valid date'),
  body('num_adults').isInt({ min: 1 }).withMessage('Number of adults must be at least 1'),
  body('num_children').optional().isInt({ min: 0 }).withMessage('Number of children must be 0 or greater'),
  body('children_ages').optional().isString().withMessage('Children ages must be a string'),
  body('special_requests').optional().isString().withMessage('Special requests must be a string'),
  body('status').optional().isIn(['confirmed', 'cancelled', 'completed']).withMessage('Invalid status'),
  body('payment_status').optional().isIn(['pending', 'paid', 'failed', 'refunded']).withMessage('Invalid payment status'),
  body('source').optional().isIn(['website', 'mobile_app', 'walk_in', 'agent', 'call_center']).withMessage('Invalid source'),
  body('currency').optional().isString().withMessage('Currency must be a string')
];

// Generate unique reservation code
const generateReservationCode = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `RES-${timestamp}-${random}`.toUpperCase();
};

// GET all reservations with guest and room details
router.get('/', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        r.reservation_id,
        r.reservation_code,
        r.check_in_date,
        r.check_out_date,
        r.check_in_time,
        r.check_out_time,
        r.num_adults,
        r.num_children,
        r.children_ages,
        r.special_requests,
        r.total_price,
        r.currency,
        r.status,
        r.payment_status,
        r.source,
        r.created_at,
        r.updated_at,
        g.guest_id,
        g.first_name,
        g.last_name,
        g.email,
        g.phone,
        rm.room_id,
        rm.room_number,
        rm.hotel,
        rt.type_name as room_type,
        rg.group_name as room_group
      FROM Reservations r
      JOIN Guests g ON r.guest_id = g.guest_id
      JOIN Rooms rm ON r.room_id = rm.room_id
      LEFT JOIN RoomTypes rt ON rm.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON rm.room_group_id = rg.room_group_id
      ORDER BY r.created_at DESC
    `);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET single reservation by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        r.*,
        g.first_name,
        g.last_name,
        g.email,
        g.phone,
        rm.room_number,
        rm.hotel,
        rt.type_name as room_type,
        rg.group_name as room_group
      FROM Reservations r
      JOIN Guests g ON r.guest_id = g.guest_id
      JOIN Rooms rm ON r.room_id = rm.room_id
      LEFT JOIN RoomTypes rt ON rm.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON rm.room_group_id = rg.room_group_id
      WHERE r.reservation_id = ?
    `, [id]);
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST create new reservation
router.post('/', authenticateToken, validateReservation, async (req, res) => {
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
      guest_id,
      room_id,
      check_in_date,
      check_out_date,
      check_in_time = '14:00:00',
      check_out_time = '11:00:00',
      num_adults = 1,
      num_children = 0,
      children_ages,
      special_requests,
      status = 'confirmed',
      payment_status = 'pending',
      source = 'website',
      currency = 'ETB'
    } = req.body;

    const connection = await mysql.createConnection(dbConfig);
    
    // Generate reservation code
    const reservationCode = generateReservationCode();
    
    // Create reservation
    const [result] = await connection.execute(`
      INSERT INTO Reservations (
        reservation_code, guest_id, room_id, check_in_date, check_out_date,
        check_in_time, check_out_time, num_adults, num_children, children_ages,
        special_requests, total_price, currency, status, payment_status, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reservationCode, guest_id, room_id, check_in_date, check_out_date,
      check_in_time, check_out_time, num_adults, num_children, children_ages,
      special_requests, 0, currency, status, payment_status, source
    ]);
    
    // Get the created reservation
    const [newReservation] = await connection.execute(`
      SELECT 
        r.*,
        g.first_name,
        g.last_name,
        g.email,
        g.phone,
        rm.room_number,
        rm.hotel,
        rt.type_name as room_type,
        rg.group_name as room_group
      FROM Reservations r
      JOIN Guests g ON r.guest_id = g.guest_id
      JOIN Rooms rm ON r.room_id = rm.room_id
      LEFT JOIN RoomTypes rt ON rm.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON rm.room_group_id = rg.room_group_id
      WHERE r.reservation_id = ?
    `, [result.insertId]);
    
    await connection.end();
    
    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: newReservation[0]
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT update reservation
router.put('/:id', authenticateToken, validateReservation, async (req, res) => {
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
      guest_id,
      room_id,
      check_in_date,
      check_out_date,
      check_in_time,
      check_out_time,
      num_adults,
      num_children,
      children_ages,
      special_requests,
      status,
      payment_status,
      source,
      currency
    } = req.body;

    const connection = await mysql.createConnection(dbConfig);
    
    // Check if reservation exists
    const [existing] = await connection.execute(
      'SELECT * FROM Reservations WHERE reservation_id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }
    
    // Update reservation
    await connection.execute(`
      UPDATE Reservations SET 
        guest_id = ?, room_id = ?, check_in_date = ?, check_out_date = ?,
        check_in_time = ?, check_out_time = ?, num_adults = ?, num_children = ?,
        children_ages = ?, special_requests = ?, currency = ?,
        status = ?, payment_status = ?, source = ?
        WHERE reservation_id = ?
    `, [
      guest_id, room_id, check_in_date, check_out_date,
      check_in_time, check_out_time, num_adults, num_children,
      children_ages, special_requests, currency,
      status, payment_status, source, id
    ]);
    
    // Get the updated reservation
    const [updatedReservation] = await connection.execute(`
      SELECT 
        r.*,
        g.first_name,
        g.last_name,
        g.email,
        g.phone,
        rm.room_number,
        rm.hotel,
        rt.type_name as room_type,
        rg.group_name as room_group
      FROM Reservations r
      JOIN Guests g ON r.guest_id = g.guest_id
      JOIN Rooms rm ON r.room_id = rm.room_id
      LEFT JOIN RoomTypes rt ON rm.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON rm.room_group_id = rg.room_group_id
      WHERE r.reservation_id = ?
    `, [id]);
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Reservation updated successfully',
      data: updatedReservation[0]
    });
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE reservation (soft delete by setting status to cancelled)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if reservation exists
    const [existing] = await connection.execute(
      'SELECT * FROM Reservations WHERE reservation_id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }
    
    // Soft delete by setting status to cancelled
    await connection.execute(
      'UPDATE Reservations SET status = "cancelled", cancelled_at = NOW() WHERE reservation_id = ?',
      [id]
    );
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Reservation cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET rooms list for dropdown
router.get('/rooms/list', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        r.room_id,
        r.room_number,
        r.hotel,
        r.status,
        rt.type_name as room_type,
        rg.group_name as room_group
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
    console.error('Error fetching rooms list:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
