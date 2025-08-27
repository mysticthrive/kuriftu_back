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

];

// Generate unique reservation code
const generateReservationCode = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `RES-${timestamp}-${random}`.toUpperCase();
};

// Calculate children pricing based on ages
const calculateChildrenPricing = (childrenAges, nights) => {
  if (!childrenAges || !nights) return { bedPrice: 0, breakfastPrice: 0 };
  
  const ages = childrenAges.split(',').map(age => parseInt(age.trim())).filter(age => !isNaN(age));
  let totalBedPrice = 0;
  let totalBreakfastPrice = 0;
  
  ages.forEach(age => {
    // Bed pricing
    if (age >= 3 && age <= 11) {
      totalBedPrice += 20; // USD 20 for ages 3-11
    } else if (age >= 12 && age <= 17) {
      totalBedPrice += 40; // USD 40 for ages 12-17
    }
    
    // Breakfast pricing
    if (age >= 6 && age <= 12) {
      totalBreakfastPrice += 15; // USD 15 for ages 6-12
    } else if (age > 12) {
      totalBreakfastPrice += 18; // USD 18 for ages above 12
    }
  });
  
  // Multiply by number of nights
  return {
    bedPrice: totalBedPrice * nights,
    breakfastPrice: totalBreakfastPrice * nights
  };
};

// Calculate room price based on room_group_room_type_id and hotel
const calculateRoomPrice = async (connection, roomGroupRoomTypeId, hotel, checkInDate = null, checkOutDate = null) => {
  if (!roomGroupRoomTypeId) return 0;
  
  // Get room pricing for weekdays first, then weekends as fallback
  const [pricing] = await connection.execute(`
    SELECT price FROM RoomPricing 
    WHERE room_group_room_type_id = ? AND hotel = ? AND day_of_week = 'weekdays'
    LIMIT 1
  `, [roomGroupRoomTypeId, hotel]);
  
  let basePrice = 0;
  if (pricing.length > 0) {
    basePrice = pricing[0].price;
  } else {
    // Fallback to weekends pricing
    const [weekendPricing] = await connection.execute(`
      SELECT price FROM RoomPricing 
      WHERE room_group_room_type_id = ? AND hotel = ? AND day_of_week = 'weekends'
      LIMIT 1
    `, [roomGroupRoomTypeId, hotel]);
    
    if (weekendPricing.length > 0) {
      basePrice = weekendPricing[0].price;
    }
  }
  
  // If check-in and check-out dates are provided, calculate total for the stay
  if (checkInDate && checkOutDate && basePrice > 0) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    return basePrice * nights;
  }
  
  return basePrice;
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
      LEFT JOIN RoomGroupRoomType rgr ON rm.room_group_room_type_id = rgr.id
      LEFT JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
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
      LEFT JOIN RoomGroupRoomType rgr ON rm.room_group_room_type_id = rgr.id
      LEFT JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
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

    } = req.body;

    const connection = await mysql.createConnection(dbConfig);
    
    // Get room details to find pricing
    const [roomDetails] = await connection.execute(`
      SELECT 
        rm.hotel,
        rm.room_group_room_type_id
      FROM Rooms rm
      WHERE rm.room_id = ?
    `, [room_id]);
    
    if (roomDetails.length === 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    const room = roomDetails[0];
    
    // Calculate total price based on room pricing and stay duration
    let totalPrice = 0;
    let nights = 0;
    
    if (room.room_group_room_type_id) {
      // Calculate number of nights
      const checkInDate = new Date(check_in_date);
      const checkOutDate = new Date(check_out_date);
      nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      
      if (nights > 0) {
        // Get room pricing for weekdays first, then weekends as fallback
        const [pricing] = await connection.execute(`
          SELECT price FROM RoomPricing 
          WHERE room_group_room_type_id = ? AND hotel = ? AND day_of_week = 'weekdays'
          LIMIT 1
        `, [room.room_group_room_type_id, room.hotel]);
        
        if (pricing.length > 0) {
          totalPrice = pricing[0].price * nights;
        } else {
          // Fallback to weekends pricing
          const [weekendPricing] = await connection.execute(`
            SELECT price FROM RoomPricing 
            WHERE room_group_room_type_id = ? AND hotel = ? AND day_of_week = 'weekends'
            LIMIT 1
          `, [room.room_group_room_type_id, room.hotel]);
          
          if (weekendPricing.length > 0) {
            totalPrice = weekendPricing[0].price * nights;
          }
        }
      }
    }
    
    // Calculate children pricing
    const childrenPricing = calculateChildrenPricing(children_ages, nights);
    totalPrice += childrenPricing.bedPrice + childrenPricing.breakfastPrice;
    
    // Generate reservation code
    const reservationCode = generateReservationCode();
    
    // Create reservation
    const [result] = await connection.execute(`
      INSERT INTO Reservations (
        reservation_code, guest_id, room_id, check_in_date, check_out_date,
        check_in_time, check_out_time, num_adults, num_children, children_ages,
        special_requests, total_price, status, payment_status, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reservationCode, guest_id, room_id, check_in_date, check_out_date,
      check_in_time, check_out_time, num_adults, num_children, children_ages,
      special_requests, totalPrice, status, payment_status, source
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
      LEFT JOIN RoomGroupRoomType rgr ON rm.room_group_room_type_id = rgr.id
      LEFT JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
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
    
    // Get room details to recalculate pricing
    const [roomDetails] = await connection.execute(`
      SELECT 
        rm.hotel,
        rm.room_group_room_type_id
      FROM Rooms rm
      WHERE rm.room_id = ?
    `, [room_id]);
    
    if (roomDetails.length === 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    const room = roomDetails[0];
    
    // Calculate total price based on room pricing and stay duration
    let totalPrice = await calculateRoomPrice(connection, room.room_group_room_type_id, room.hotel, check_in_date, check_out_date);
    
    // Calculate number of nights for children pricing
    const checkInDate = new Date(check_in_date);
    const checkOutDate = new Date(check_out_date);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    // Calculate children pricing
    const childrenPricing = calculateChildrenPricing(children_ages, nights);
    totalPrice += childrenPricing.bedPrice + childrenPricing.breakfastPrice;
    
    // Update reservation
    await connection.execute(`
      UPDATE Reservations SET 
        guest_id = ?, room_id = ?, check_in_date = ?, check_out_date = ?,
        check_in_time = ?, check_out_time = ?, num_adults = ?, num_children = ?,
        children_ages = ?, special_requests = ?, total_price = ?,
        status = ?, payment_status = ?, source = ?
        WHERE reservation_id = ?
    `, [
      guest_id, room_id, check_in_date, check_out_date,
      check_in_time, check_out_time, num_adults, num_children,
      children_ages, special_requests, totalPrice,
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
      LEFT JOIN RoomGroupRoomType rgr ON rm.room_group_room_type_id = rgr.id
      LEFT JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
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
        rg.group_name as room_group,
        rt.max_occupancy
      FROM Rooms r
      LEFT JOIN RoomGroupRoomType rgr ON r.room_group_room_type_id = rgr.id
      LEFT JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
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

// Debug endpoint to check room pricing
router.get('/debug/pricing/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    // Get room details
    const [roomDetails] = await connection.execute(`
      SELECT 
        rm.room_id,
        rm.hotel,
        rm.room_group_room_type_id,
        rt.type_name,
        rg.group_name
      FROM Rooms rm
      LEFT JOIN RoomGroupRoomType rgr ON rm.room_group_room_type_id = rgr.id
      LEFT JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      LEFT JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      WHERE rm.room_id = ?
    `, [roomId]);
    
    if (roomDetails.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    const room = roomDetails[0];
    
    // Get pricing for this room
    const [pricing] = await connection.execute(`
      SELECT 
        rp.pricing_id,
        rp.price,
        rp.day_of_week,
        rp.hotel,
        rp.room_group_room_type_id
      FROM RoomPricing rp
      WHERE rp.room_group_room_type_id = ? AND rp.hotel = ?
      ORDER BY rp.day_of_week
    `, [room.room_group_room_type_id, room.hotel]);
    
    const calculatedPrice = await calculateRoomPrice(connection, room.room_group_room_type_id, room.hotel);
    
    await connection.end();
    
    res.json({
      success: true,
      data: {
        room,
        pricing,
        calculatedPrice
      }
    });
  } catch (error) {
    console.error('Error debugging pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
