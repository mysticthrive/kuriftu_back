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
  database: process.env.DB_NAME || 'fullstack_app'
};

// Validation middleware
const validateMenuPermission = [
  body('role_name').notEmpty().withMessage('Role name is required'),
  body('menu_id').notEmpty().withMessage('Menu ID is required'),
  body('can_view').isBoolean().withMessage('Can view must be a boolean')
];

// GET all menu items with permissions for all roles
// router.get('/menu-items', authenticateToken, async (req, res) => {
//   try {
//     const connection = await mysql.createConnection(dbConfig);
    
//     const [rows] = await connection.execute(`
//       SELECT 
//         m.menu_id,
//         m.label,
//         m.icon,
//         m.href,
//         m.parent_id,
//         m.sort_order,
//         m.is_active,
//         JSON_OBJECTAGG(
//           r.role_name, 
//           COALESCE(mp.can_view, FALSE)
//         ) as permissions
//       FROM menu_items m
//       CROSS JOIN user_roles r
//       LEFT JOIN menu_permissions mp ON m.menu_id = mp.menu_id AND r.id = mp.role_id
//       WHERE m.is_active = TRUE
//       GROUP BY m.menu_id, m.label, m.icon, m.href, m.parent_id, m.sort_order
//       ORDER BY m.sort_order, m.label
//     `);
    
//     await connection.end();
    
//     res.json({
//       success: true,
//       data: rows
//     });
//   } catch (error) {
//     console.error('Error fetching menu items:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// });

router.get('/menu-items', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // First, get all menu items
    const [menuItems] = await connection.execute(`
      SELECT 
        m.menu_id,
        m.label,
        m.icon,
        m.href,
        m.parent_id,
        m.sort_order,
        m.is_active
      FROM menu_items m
      WHERE m.is_active = TRUE
      ORDER BY m.sort_order, m.label
    `);
    
    // Then, get all permissions for each menu item
    const [permissions] = await connection.execute(`
      SELECT 
        mp.menu_id,
        r.role_name,
        COALESCE(mp.can_view, FALSE) as can_view
      FROM menu_items m
      CROSS JOIN user_roles r
      LEFT JOIN menu_permissions mp ON m.menu_id = mp.menu_id AND r.id = mp.role_id
      WHERE m.is_active = TRUE
    `);
    
    // Group permissions by menu_id
    const permissionsMap = {};
    permissions.forEach(perm => {
      if (!permissionsMap[perm.menu_id]) {
        permissionsMap[perm.menu_id] = {};
      }
      permissionsMap[perm.menu_id][perm.role_name] = perm.can_view;
    });
    
    // Combine menu items with their permissions
    const result = menuItems.map(item => ({
      ...item,
      permissions: permissionsMap[item.menu_id] || {}
    }));
    
    await connection.end();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET menu items for a specific role
router.get('/menu-items/:roleName', authenticateToken, async (req, res) => {
  try {
    const { roleName } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    // First, get all visible parent items
    const [parentRows] = await connection.execute(`
      SELECT 
        m.menu_id,
        m.label,
        m.icon,
        m.href,
        m.parent_id,
        m.sort_order,
        mp.can_view
      FROM menu_items m
      JOIN menu_permissions mp ON m.menu_id = mp.menu_id
      JOIN user_roles r ON mp.role_id = r.id
      WHERE r.role_name = ? 
      AND mp.can_view = TRUE
      AND m.is_active = TRUE
      AND m.parent_id IS NULL
      ORDER BY m.sort_order, m.label
    `, [roleName]);
    
    // Get all visible child items
    const [visibleChildRows] = await connection.execute(`
      SELECT 
        m.menu_id,
        m.label,
        m.icon,
        m.href,
        m.parent_id,
        m.sort_order,
        mp.can_view
      FROM menu_items m
      JOIN menu_permissions mp ON m.menu_id = mp.menu_id
      JOIN user_roles r ON mp.role_id = r.id
      WHERE r.role_name = ? 
      AND mp.can_view = TRUE
      AND m.is_active = TRUE
      AND m.parent_id IS NOT NULL
      ORDER BY m.sort_order, m.label
    `, [roleName]);
    
    // Get parent IDs of visible children
    const visibleChildParentIds = [...new Set(visibleChildRows.map(row => row.parent_id))];
    
    // Get additional parent items that have visible children (but parent itself might not be visible)
    let additionalParentRows = [];
    if (visibleChildParentIds.length > 0) {
      const [additionalParents] = await connection.execute(`
        SELECT 
          m.menu_id,
          m.label,
          m.icon,
          m.href,
          m.parent_id,
          m.sort_order,
          COALESCE(mp.can_view, FALSE) as can_view
        FROM menu_items m
        LEFT JOIN menu_permissions mp ON m.menu_id = mp.menu_id
        LEFT JOIN user_roles r ON mp.role_id = r.id AND r.role_name = ?
        WHERE m.menu_id IN (${visibleChildParentIds.map(() => '?').join(',')})
        AND m.is_active = TRUE
        ORDER BY m.sort_order, m.label
      `, [roleName, ...visibleChildParentIds]);
      
      additionalParentRows = additionalParents;
    }
    
    // Get all children of any visible parent (including parents that became visible due to visible children)
    const allParentIds = [...new Set([
      ...parentRows.map(row => row.menu_id),
      ...visibleChildParentIds
    ])];
    
    let allChildRows = [];
    if (allParentIds.length > 0) {
      const [childResult] = await connection.execute(`
        SELECT 
          m.menu_id,
          m.label,
          m.icon,
          m.href,
          m.parent_id,
          m.sort_order,
          mp.can_view
        FROM menu_items m
        JOIN menu_permissions mp ON m.menu_id = mp.menu_id
        JOIN user_roles r ON mp.role_id = r.id AND r.role_name = ?
        WHERE m.parent_id IN (${allParentIds.map(() => '?').join(',')})
        AND m.is_active = TRUE
        AND mp.can_view = TRUE
        ORDER BY m.sort_order, m.label
      `, [roleName, ...allParentIds]);
      
      allChildRows = childResult;
    }
    
    // Combine all items, removing duplicates
    const allRows = [
      ...parentRows,
      ...additionalParentRows.filter(parent => !parentRows.some(p => p.menu_id === parent.menu_id)),
      ...allChildRows
    ];
    
    await connection.end();
    
    res.json({
      success: true,
      data: allRows
    });
  } catch (error) {
    console.error('Error fetching menu items for role:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET all roles
router.get('/roles', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT * FROM user_roles ORDER BY role_name
    `);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET all permissions matrix
router.get('/permissions', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        r.role_name,
        m.menu_id,
        m.label,
        mp.can_view,
        mp.updated_at
      FROM user_roles r
      JOIN menu_permissions mp ON r.id = mp.role_id
      JOIN menu_items m ON mp.menu_id = m.menu_id
      WHERE m.is_active = TRUE
      ORDER BY r.role_name, m.sort_order
    `);
    
    await connection.end();
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// UPDATE menu permission for a role
router.put('/permissions', validateMenuPermission, authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { role_name, menu_id, can_view } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    // Update permission
    const [result] = await connection.execute(`
      UPDATE menu_permissions mp
      JOIN user_roles r ON mp.role_id = r.id
      SET mp.can_view = ?, mp.updated_at = CURRENT_TIMESTAMP
      WHERE r.role_name = ? AND mp.menu_id = ?
    `, [can_view, role_name, menu_id]);
    
    if (result.affectedRows === 0) {
      // If no rows were updated, insert new permission
      await connection.execute(`
        INSERT INTO menu_permissions (role_id, menu_id, can_view)
        SELECT r.id, ?, ?
        FROM user_roles r
        WHERE r.role_name = ?
      `, [menu_id, can_view, role_name]);
    }
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Permission updated successfully'
    });
  } catch (error) {
    console.error('Error updating permission:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});



// ADD new menu item
router.post('/menu-items', authenticateToken, [
  body('menu_id').notEmpty().withMessage('Menu ID is required'),
  body('label').notEmpty().withMessage('Label is required'),
  body('icon').optional(),
  body('href').optional(),
  body('parent_id').optional(),
  body('sort_order').optional().isInt().withMessage('Sort order must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { menu_id, label, icon, href, parent_id, sort_order } = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    // Start transaction
    await connection.beginTransaction();
    
    try {
      // Insert menu item
      const [result] = await connection.execute(`
        INSERT INTO menu_items (menu_id, label, icon, href, parent_id, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [menu_id, label, icon, href, parent_id, sort_order || 0]);
      
      // Set default permissions (only Admin can view by default)
      await connection.execute(`
        INSERT INTO menu_permissions (role_id, menu_id, can_view)
        SELECT r.id, ?, TRUE
        FROM user_roles r
        WHERE r.role_name = 'Admin'
      `, [menu_id]);
      
      await connection.commit();
      await connection.end();
      
      res.status(201).json({
        success: true,
        message: 'Menu item created successfully',
        data: { id: result.insertId, menu_id, label }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// UPDATE menu item
router.put('/menu-items/:menuId', authenticateToken, [
  body('label').optional(),
  body('icon').optional(),
  body('href').optional(),
  body('parent_id').optional(),
  body('sort_order').optional().isInt().withMessage('Sort order must be an integer'),
  body('is_active').optional().isBoolean().withMessage('Is active must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { menuId } = req.params;
    const updateData = req.body;
    const connection = await mysql.createConnection(dbConfig);
    
    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    });
    
    if (updateFields.length === 0) {
      await connection.end();
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    updateValues.push(menuId);
    
    const [result] = await connection.execute(`
      UPDATE menu_items 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE menu_id = ?
    `, updateValues);
    
    await connection.end();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Menu item updated successfully'
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
