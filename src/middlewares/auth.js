import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { UnauthorizedError, ForbiddenError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Middleware verifying JWT Access Token from Authorization header.
 * Attaches the authenticated User document to req.user.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw new UnauthorizedError('Authentication required. Missing Bearer access token.', 'TOKEN_MISSING');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Access token has expired. Please refresh your session.', 'TOKEN_EXPIRED');
    }
    throw new UnauthorizedError('Invalid access token.', 'TOKEN_INVALID');
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new UnauthorizedError('Account associated with this token no longer exists.', 'USER_NOT_FOUND');
  }

  if (user.status !== 'ACTIVE') {
    throw new ForbiddenError(`Account is currently ${user.status.toLowerCase()}. Access denied.`, 'ACCOUNT_INACTIVE');
  }

  if (user.isLocked()) {
    throw new ForbiddenError('Account is temporarily locked due to excessive failed logins.', 'ACCOUNT_LOCKED');
  }

  if (decoded.sessionId) {
    const session = await Session.findById(decoded.sessionId);
    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Session has been revoked or expired. Please log in again.', 'SESSION_REVOKED');
    }
  }

  req.user = user;
  req.sessionId = decoded.sessionId || null;
  next();
});

/**
 * Role-Based Access Control (RBAC) middleware generator.
 *
 * @param {...string} allowedRoles - e.g. 'ADMIN', 'SUPER_ADMIN', 'STAFF'
 * @returns {Function} Express middleware handler
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.', 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'.`,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

/**
 * Safeguard preventing role escalation during public customer registration.
 * Explicitly rejects any request attempting to submit non-CUSTOMER roles.
 */
export const preventRoleEscalation = (req, res, next) => {
  if (req.body && req.body.role && req.body.role !== 'CUSTOMER') {
    return next(
      new ForbiddenError(
        'Elevated administrative roles cannot be assigned through public registration.',
        'ROLE_ESCALATION_BLOCKED'
      )
    );
  }

  // Enforce customer role on registration payloads
  if (req.body) {
    req.body.role = 'CUSTOMER';
  }

  next();
};

/**
 * Optional authentication middleware.
 * If a valid Bearer token is provided, attaches req.user without throwing if token is absent or invalid.
 */
export const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId);
    if (user && user.status === 'ACTIVE' && !user.isLocked()) {
      req.user = user;
      req.sessionId = decoded.sessionId || null;
    }
  } catch {
    // Gracefully ignore invalid or expired tokens in optional auth
  }

  next();
});
