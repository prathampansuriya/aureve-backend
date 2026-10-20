import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import './models/index.js';
import { env } from './config/env.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { globalLimiter } from './middlewares/rateLimiter.js';
import { NotFoundError } from './utils/AppError.js';
import apiRouter from './routes/index.js';

export const createApp = () => {
  const app = express();

  // 1. Security HTTP headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
      hsts: env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false
    })
  );

  // 2. Cross-Origin Resource Sharing with strict allowlist
  const allowedOrigins = [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or from allowed origins
        if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error(`CORS policy blocked access from origin: ${origin}`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-Id',
        'X-Idempotency-Key',
        'Idempotency-Key',
        'x-guest-token',
        'X-Guest-Token',
        'Accept',
        'X-Requested-With'
      ],
      exposedHeaders: ['X-Request-Id', 'X-Idempotency-Key']
    })
  );

  // 3. Rate limiting infrastructure
  app.use('/api', globalLimiter);

  // 4. Request size limits (strict 10kb body parser to prevent DoS) and raw body capture for webhook signature verification
  app.use(
    express.json({
      limit: '10kb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // 5. Request correlation ID & Winston request logging
  app.use(requestLogger);

  // 6. Versioned API Routes (/api/v1)
  app.use(env.API_PREFIX, apiRouter);

  // 7. 404 Handler for undefined routes
  app.all('*', (req, res, next) => {
    next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl} on this server.`));
  });

  // 8. Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
