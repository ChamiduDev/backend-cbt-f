const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Health check endpoint for Railway
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      port: process.env.PORT || 3000,
      mongoUri: process.env.MONGO_URI ? 'configured' : 'missing',
      jwtSecret: process.env.JWT_SECRET ? 'configured' : 'missing',
      emailService: process.env.EMAIL_SERVICE ? 'configured' : 'missing'
    };

    // If database is not connected, return unhealthy status
    if (dbStatus === 'disconnected') {
      healthStatus.status = 'unhealthy';
      healthStatus.message = 'Database connection failed';
      return res.status(503).json(healthStatus);
    }

    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
