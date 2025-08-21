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
const validateRoomTypeImage = [
  body('room_group_room_type_id').isInt().withMessage('Room Group Room Type ID must be a valid integer'),
  body('image_url').isURL().withMessage('Image URL must be a valid URL'),
  body('alt_text').optional().isLength({ max: 255 }).withMessage('Alt text must be less than 255 characters'),
  body('is_primary').optional().isBoolean().withMessage('Is primary must be a boolean value')
];

// GET all room type images with relationship details
router.get('/', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        rti.image_id,
        rti.room_group_room_type_id,
        rti.image_url,
        rti.alt_text,
        rti.is_primary,
        rti.created_at,
        rg.group_name,
        rt.type_name,
        rt.max_occupancy
      FROM RoomTypeImages rti
      JOIN RoomGroupRoomType rgr ON rti.room_group_room_type_id = rgr.id
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      ORDER BY rti.room_group_room_type_id, rti.is_primary DESC, rti.created_at
    `);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching room type images:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET room type image by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        rti.image_id,
        rti.room_group_room_type_id,
        rti.image_url,
        rti.alt_text,
        rti.is_primary,
        rti.created_at,
        rg.group_name,
        rt.type_name,
        rt.max_occupancy
      FROM RoomTypeImages rti
      JOIN RoomGroupRoomType rgr ON rti.room_group_room_type_id = rgr.id
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      WHERE rti.image_id = ?
    `, [id]);
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room type image not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching room type image:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET images by room group room type ID
router.get('/relationship/:roomGroupRoomTypeId', async (req, res) => {
  try {
    const { roomGroupRoomTypeId } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        rti.image_id,
        rti.room_group_room_type_id,
        rti.image_url,
        rti.alt_text,
        rti.is_primary,
        rti.created_at,
        rg.group_name,
        rt.type_name,
        rt.max_occupancy
      FROM RoomTypeImages rti
      JOIN RoomGroupRoomType rgr ON rti.room_group_room_type_id = rgr.id
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      WHERE rti.room_group_room_type_id = ?
      ORDER BY rti.is_primary DESC, rti.created_at
    `, [roomGroupRoomTypeId]);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching room type images by relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET primary images for all relationships
router.get('/primary/all', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        rti.image_id,
        rti.room_group_room_type_id,
        rti.image_url,
        rti.alt_text,
        rti.is_primary,
        rti.created_at,
        rg.group_name,
        rt.type_name,
        rt.max_occupancy
      FROM RoomTypeImages rti
      JOIN RoomGroupRoomType rgr ON rti.room_group_room_type_id = rgr.id
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      WHERE rti.is_primary = TRUE
      ORDER BY rg.group_name, rt.type_name
    `);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching primary room type images:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// POST create new room type image
router.post('/', validateRoomTypeImage, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { room_group_room_type_id, image_url, alt_text, is_primary } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if relationship exists
    const [relationship] = await connection.execute(
      'SELECT * FROM RoomGroupRoomType WHERE id = ?',
      [room_group_room_type_id]
    );
    
    if (relationship.length === 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'Room group room type relationship not found'
      });
    }
    
    // If this is a primary image, unset other primary images for this relationship
    if (is_primary) {
      await connection.execute(
        'UPDATE RoomTypeImages SET is_primary = FALSE WHERE room_group_room_type_id = ?',
        [room_group_room_type_id]
      );
    }
    
    // Create room type image
    const [result] = await connection.execute(`
      INSERT INTO RoomTypeImages (room_group_room_type_id, image_url, alt_text, is_primary)
      VALUES (?, ?, ?, ?)
    `, [room_group_room_type_id, image_url, alt_text || null, is_primary || false]);
    
    // Get the created image with details
    const [newImage] = await connection.execute(`
      SELECT 
        rti.image_id,
        rti.room_group_room_type_id,
        rti.image_url,
        rti.alt_text,
        rti.is_primary,
        rti.created_at,
        rg.group_name,
        rt.type_name,
        rt.max_occupancy
      FROM RoomTypeImages rti
      JOIN RoomGroupRoomType rgr ON rti.room_group_room_type_id = rgr.id
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      WHERE rti.image_id = ?
    `, [result.insertId]);
    
    await connection.end();
    
    res.status(201).json({
      success: true,
      message: 'Room type image created successfully',
      data: newImage[0]
    });
  } catch (error) {
    console.error('Error creating room type image:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT update room type image
router.put('/:id', validateRoomTypeImage, async (req, res) => {
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
    const { room_group_room_type_id, image_url, alt_text, is_primary } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if image exists
    const [existing] = await connection.execute('SELECT * FROM RoomTypeImages WHERE image_id = ?', [id]);
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Room type image not found'
      });
    }
    
    // Check if relationship exists
    const [relationship] = await connection.execute(
      'SELECT * FROM RoomGroupRoomType WHERE id = ?',
      [room_group_room_type_id]
    );
    
    if (relationship.length === 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'Room group room type relationship not found'
      });
    }
    
    // If this is a primary image, unset other primary images for this relationship
    if (is_primary) {
      await connection.execute(
        'UPDATE RoomTypeImages SET is_primary = FALSE WHERE room_group_room_type_id = ? AND image_id != ?',
        [room_group_room_type_id, id]
      );
    }
    
    // Update room type image
    await connection.execute(`
      UPDATE RoomTypeImages SET
        room_group_room_type_id = ?, image_url = ?, alt_text = ?, is_primary = ?
        WHERE image_id = ?
    `, [room_group_room_type_id, image_url, alt_text || null, is_primary || false, id]);
    
    // Get the updated image with details
    const [updatedImage] = await connection.execute(`
      SELECT 
        rti.image_id,
        rti.room_group_room_type_id,
        rti.image_url,
        rti.alt_text,
        rti.is_primary,
        rti.created_at,
        rg.group_name,
        rt.type_name,
        rt.max_occupancy
      FROM RoomTypeImages rti
      JOIN RoomGroupRoomType rgr ON rti.room_group_room_type_id = rgr.id
      JOIN RoomGroups rg ON rgr.room_group_id = rg.room_group_id
      JOIN RoomTypes rt ON rgr.room_type_id = rt.room_type_id
      WHERE rti.image_id = ?
    `, [id]);
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Room type image updated successfully',
      data: updatedImage[0]
    });
  } catch (error) {
    console.error('Error updating room type image:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// PUT set image as primary
router.put('/:id/set-primary', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if image exists
    const [existing] = await connection.execute('SELECT * FROM RoomTypeImages WHERE image_id = ?', [id]);
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Room type image not found'
      });
    }
    
    // Unset other primary images for this relationship
    await connection.execute(
      'UPDATE RoomTypeImages SET is_primary = FALSE WHERE room_group_room_type_id = ?',
      [existing[0].room_group_room_type_id]
    );
    
    // Set this image as primary
    await connection.execute(
      'UPDATE RoomTypeImages SET is_primary = TRUE WHERE image_id = ?',
      [id]
    );
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Image set as primary successfully'
    });
  } catch (error) {
    console.error('Error setting image as primary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// DELETE room type image
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if image exists
    const [existing] = await connection.execute('SELECT * FROM RoomTypeImages WHERE image_id = ?', [id]);
    if (existing.length === 0) {
      await connection.end();
      return res.status(404).json({
        success: false,
        message: 'Room type image not found'
      });
    }
    
    // Delete image
    await connection.execute('DELETE FROM RoomTypeImages WHERE image_id = ?', [id]);
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Room type image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting room type image:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
