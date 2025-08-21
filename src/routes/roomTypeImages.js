const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kuriftur_Hayle'
};



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

// POST create new room type image with file upload
router.post('/upload', async (req, res) => {
  try {
    const { room_group_room_type_id, image_url, alt_text, is_primary } = req.body;
    
    if (!room_group_room_type_id || !image_url) {
      return res.status(400).json({
        success: false,
        message: 'Room group room type ID and image URL are required'
      });
    }

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
        message: 'Invalid room group room type relationship'
      });
    }

    // If setting as primary, unset other primary images for this relationship
    if (is_primary) {
      await connection.execute(
        'UPDATE RoomTypeImages SET is_primary = FALSE WHERE room_group_room_type_id = ?',
        [room_group_room_type_id]
      );
    }

    // Insert new image
    const [result] = await connection.execute(`
      INSERT INTO RoomTypeImages (room_group_room_type_id, image_url, alt_text, is_primary)
      VALUES (?, ?, ?, ?)
    `, [room_group_room_type_id, image_url, alt_text || null, is_primary || false]);

    // Fetch the created image with relationship details
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

// PUT update room type image with file upload
router.put('/:id/upload', async (req, res) => {
  try {
    const { id } = req.params;
    const { image_url, alt_text, is_primary } = req.body;
    
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

    // If setting as primary, unset other primary images for this relationship
    if (is_primary) {
      await connection.execute(
        'UPDATE RoomTypeImages SET is_primary = FALSE WHERE room_group_room_type_id = ? AND image_id != ?',
        [existing[0].room_group_room_type_id, id]
      );
    }

    // Update image
    const updateFields = [];
    const updateValues = [];
    
    if (image_url !== undefined) {
      updateFields.push('image_url = ?');
      updateValues.push(image_url);
    }
    
    if (alt_text !== undefined) {
      updateFields.push('alt_text = ?');
      updateValues.push(alt_text);
    }
    
    if (is_primary !== undefined) {
      updateFields.push('is_primary = ?');
      updateValues.push(is_primary);
    }
    
    if (updateFields.length === 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    updateValues.push(id);
    
    await connection.execute(`
      UPDATE RoomTypeImages 
      SET ${updateFields.join(', ')}
      WHERE image_id = ?
    `, updateValues);

    // Fetch the updated image with relationship details
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

module.exports = router;
