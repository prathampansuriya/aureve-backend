import { ZodError } from 'zod';
import { ValidationError } from '../utils/AppError.js';
import { sanitizeNoSqlOperators } from '../utils/queryHelper.js';

/**
 * Middleware factory for validating incoming request payloads against Zod schemas.
 * Validates body, query, and params partitions.
 * Automatically enforces NoSQL sanitization and mass-assignment protection.
 *
 * @param {Object} schemas - Validation schemas { body, query, params, sanitizeNoSql }
 * @returns {Function} Express middleware handler
 */
export const validateRequest = (schemas = {}) => {
  return async (req, res, next) => {
    try {
      // 1. Sanitize against NoSQL operator injection unless explicitly disabled
      if (schemas.sanitizeNoSql !== false) {
        if (req.body) req.body = sanitizeNoSqlOperators(req.body);
        if (req.query) req.query = sanitizeNoSqlOperators(req.query);
        if (req.params) req.params = sanitizeNoSqlOperators(req.params);
      }

      // 2. Validate Path Parameters
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }

      // 3. Validate Query Strings (Pagination, filters, sort)
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }

      // 4. Validate Request Body
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return next(new ValidationError('The request payload failed schema validation.', details));
      }
      next(error);
    }
  };
};
