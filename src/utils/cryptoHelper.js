import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcrypt with 12 salt rounds.
 *
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} BCRYPT hash
 */
export const hashPassword = async (password) => {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

/**
 * Validates a plaintext password against a bcrypt hash.
 *
 * @param {string} password - Plaintext password
 * @param {string} hash - Stored bcrypt hash
 * @returns {Promise<boolean>} True if match
 */
export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 *
 * @returns {string} 6-digit numeric code
 */
export const generateSecureOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Generates a cryptographically secure random hexadecimal token.
 *
 * @param {number} bytes - Byte count (default 32)
 * @returns {string} Hex token string
 */
export const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Computes a SHA-256 hash of a string (OTP or refresh token).
 *
 * @param {string} token - Raw token string
 * @returns {string} Hex digest
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Issues a 15-minute JWT Access Token.
 *
 * @param {Object} payload - { userId, email, role, sessionId }
 * @returns {string} Signed JWT
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY || '15m'
  });
};

/**
 * Verifies a JWT Access Token.
 *
 * @param {string} token - Bearer JWT
 * @returns {Object} Decoded payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};
