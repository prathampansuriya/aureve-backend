import express from 'express';
import mongoose from 'mongoose';
import { isDbConnected } from '../config/db.js';
import { env } from '../config/env.js';

const router = express.Router();

/**
 * @route   GET /api/v1/health
 * @desc    Liveness & basic service health
 */
router.get('/', (req, res) => {
  const dbStatus = isDbConnected() ? 'connected' : 'disconnected';
  const isHealthy = isDbConnected();

  const responsePayload = {
    success: isHealthy,
    statusCode: isHealthy ? 200 : 503,
    message: isHealthy ? 'AUREVÉ API service is operating normally.' : 'AUREVÉ API service is degraded (Database disconnected).',
    data: {
      status: isHealthy ? 'healthy' : 'degraded',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        readyState: mongoose.connection.readyState
      }
    }
  };

  res.status(isHealthy ? 200 : 503).json(responsePayload);
});

/**
 * @route   GET /api/v1/health/readiness
 * @desc    Strict readiness probe (Database & critical dependencies check)
 */
router.get('/readiness', (req, res) => {
  const connected = isDbConnected();

  if (!connected) {
    return res.status(503).json({
      success: false,
      statusCode: 503,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'AUREVÉ API is not ready. Database connection is inactive or degraded.',
        database: {
          status: 'disconnected',
          readyState: mongoose.connection.readyState
        },
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    });
  }

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'AUREVÉ API is ready to accept traffic.',
    data: {
      status: 'ready',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        readyState: mongoose.connection.readyState
      }
    }
  });
});

export default router;
