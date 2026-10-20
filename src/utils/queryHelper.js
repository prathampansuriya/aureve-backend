import { z } from 'zod';
import { ValidationError } from './AppError.js';

/**
 * Standard pagination and sorting schema for list queries.
 * Prevents unbounded queries by strictly capping limit to max 50.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be greater than or equal to 1.').default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1.').max(50, 'Limit cannot exceed 50 items per page.').default(20),
  sortBy: z.string().trim().optional(),
  order: z.enum(['asc', 'desc']).default('desc')
});

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId.');

/**
 * Schema for validating route parameters that contain an 'id' property as a MongoDB ObjectId.
 */
export const objectIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId parameter.')
});

/**
 * Recursively scans an object for dangerous NoSQL injection operators ($ prefix or dots).
 * Throws a ValidationError if an illegal operator is detected.
 */
export const sanitizeNoSqlOperators = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeNoSqlOperators);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('$') || key.includes('.')) {
      throw new ValidationError(`Potential NoSQL injection detected in key '${key}'. Operator keys are not permitted.`);
    }
    sanitized[key] = sanitizeNoSqlOperators(value);
  }

  return sanitized;
};

/**
 * Parses and verifies sort parameters against a strict allowlist.
 *
 * @param {string} sortBy - Requested sort field name
 * @param {string} order - 'asc' or 'desc'
 * @param {Array<string>} allowedFields - Allowed sortable property names
 * @param {string} defaultField - Fallback sort property name
 * @returns {Object} Mongoose sort object, e.g. { createdAt: -1 }
 */
export const buildSafeSort = (sortBy, order = 'desc', allowedFields = ['createdAt'], defaultField = 'createdAt') => {
  const direction = order.toLowerCase() === 'asc' ? 1 : -1;

  if (sortBy && allowedFields.includes(sortBy)) {
    return { [sortBy]: direction };
  }

  return { [defaultField]: direction };
};
