import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const createLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 300,
  message = 'Too many requests from this IP address. Please try again after 15 minutes.'
} = {}) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,  // Disable `X-RateLimit-*` headers
    skip: () => env.NODE_ENV === 'test', // Skip in automated test environments
    handler: (req, res) => {
      const requestId = req.id || req.headers['x-request-id'] || 'unknown';

      res.status(429).json({
        success: false,
        statusCode: 429,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  });
};

/**
 * Standard global API rate limiter: 300 requests per 15-minute window
 */
export const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Global API rate limit exceeded. Please try again later.'
});

/**
 * Strict authentication rate limiter: 10 requests per 15-minute window (brute-force defense)
 */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Please try again after 15 minutes.'
});

/**
 * High-sensitivity OTP rate limiter: 3 requests per 15-minute window (SMS/Email flood defense)
 */
export const otpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many OTP requests. Please wait 15 minutes before requesting a new code.'
});

/**
 * Payment order creation limiter: 20 requests per 15-minute window
 */
export const paymentLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Payment order creation threshold reached. Please try again shortly.'
});

/**
 * Media upload rate limiter: 60 upload requests per 15-minute window
 */
export const mediaUploadLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Upload frequency threshold reached. Please wait before uploading more media files.'
});
