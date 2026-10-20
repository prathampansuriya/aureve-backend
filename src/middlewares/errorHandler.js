import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected internal server error occurred.';
  let details = err.details || null;

  // Handle known operational AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
    details = err.details;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_FAILED';
    message = 'The request payload failed schema validation.';
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
  }

  // Handle Mongoose validation errors (ignore if it's already an AppError)
  if (err.name === 'ValidationError' && !(err instanceof AppError)) {
    statusCode = 400;
    errorCode = 'VALIDATION_FAILED';
    message = 'Validation failed for one or more fields.';
    details = Object.values(err.errors || {}).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_IDENTIFIER';
    message = `Invalid format for field '${err.path}': ${err.value}`;
  }

  // Handle MongoDB duplicate key error (11000)
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'CONFLICT';
    const fields = Object.keys(err.keyValue || {});
    message = `Duplicate value for unique field(s): ${fields.join(', ')}`;
    details = err.keyValue;
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Malformed JSON in request body.';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'TOKEN_INVALID';
    message = 'Authentication token is malformed or invalid.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired. Please refresh your session.';
  }

  // Handle Multer upload limits
  if (err.name === 'MulterError') {
    statusCode = 400;
    errorCode = 'UPLOAD_LIMIT_EXCEEDED';
    message = err.message;
  }

  const requestId = req.id || req.headers['x-request-id'] || 'unknown';

  // Log 500 server errors with stack
  if (statusCode >= 500) {
    logger.error(`Unhandled Exception: ${err.message}`, {
      stack: err.stack,
      requestId,
      method: req.method,
      url: req.originalUrl
    });

    if (env.NODE_ENV === 'production') {
      message = 'An unexpected internal server error occurred.';
    }
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    error: {
      code: errorCode,
      message,
      ...(details ? { details } : {}),
      requestId,
      timestamp: new Date().toISOString()
    }
  });
};
