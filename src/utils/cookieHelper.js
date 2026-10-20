import { env } from '../config/env.js';

export const REFRESH_COOKIE_NAME = 'aureve_refresh';

/**
 * Attaches the rotating refresh token as a hardened HTTP-only cookie.
 *
 * @param {import('express').Response} res - Express response object
 * @param {string} token - Raw refresh token string
 */
export const setRefreshTokenCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'test' ? 'strict' : (env.NODE_ENV === 'production' ? 'none' : 'lax'),
    signed: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: `${env.API_PREFIX}/auth`
  });
};

/**
 * Clears the refresh token cookie upon logout or breach detection.
 *
 * @param {import('express').Response} res - Express response object
 */
export const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'test' ? 'strict' : (env.NODE_ENV === 'production' ? 'none' : 'lax'),
    signed: true,
    path: `${env.API_PREFIX}/auth`
  });
};
