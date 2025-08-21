const express = require('express');
const router = express.Router();
const { testConnection } = require('../config/database');

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    await testConnection();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      message: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
