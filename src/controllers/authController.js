import { AuthService } from '../services/authService.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie, REFRESH_COOKIE_NAME } from '../utils/cookieHelper.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body);

  sendResponse(res, {
    statusCode: 201,
    message: 'Account registered successfully. A verification code has been dispatched to your email.',
    data: result
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const result = await AuthService.verifyOtp(req.body);

  sendResponse(res, {
    statusCode: 200,
    message: 'Verification completed successfully. Your account is now active.',
    data: result
  });
});

export const resendOtp = asyncHandler(async (req, res) => {
  const result = await AuthService.resendOtp(req.body);

  sendResponse(res, {
    statusCode: 200,
    message: result.message
  });
});

export const login = asyncHandler(async (req, res) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
  const deviceFingerprint = req.headers['x-device-fingerprint'] || `${userAgent}-${ipAddress}`;

  const { accessToken, rawRefreshToken, user } = await AuthService.login({
    email: req.body.email,
    password: req.body.password,
    deviceFingerprint,
    userAgent,
    ipAddress
  });

  // Attach rotating refresh token as HTTP-only secure cookie
  setRefreshTokenCookie(res, rawRefreshToken);

  sendResponse(res, {
    statusCode: 200,
    message: 'Authentication successful. Welcome to AUREVÉ.',
    data: {
      accessToken,
      user
    }
  });
});

export const refresh = asyncHandler(async (req, res) => {
  // Read token from signed cookies, standard cookies, or fallback body
  const rawRefreshToken =
    req.signedCookies?.[REFRESH_COOKIE_NAME] ||
    req.cookies?.[REFRESH_COOKIE_NAME] ||
    req.body?.refreshToken;

  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || 'unknown';
  const deviceFingerprint = req.headers['x-device-fingerprint'] || `${userAgent}-${ipAddress}`;

  const { newAccessToken, newRawRefreshToken } = await AuthService.rotateRefreshToken({
    rawRefreshToken,
    deviceFingerprint,
    userAgent,
    ipAddress
  });

  // Update rotated cookie
  setRefreshTokenCookie(res, newRawRefreshToken);

  sendResponse(res, {
    statusCode: 200,
    message: 'Access token refreshed successfully.',
    data: {
      accessToken: newAccessToken
    }
  });
});

export const logout = asyncHandler(async (req, res) => {
  const rawRefreshToken =
    req.signedCookies?.[REFRESH_COOKIE_NAME] ||
    req.cookies?.[REFRESH_COOKIE_NAME] ||
    req.body?.refreshToken;

  await AuthService.logout({
    rawRefreshToken,
    sessionId: req.sessionId
  });

  clearRefreshTokenCookie(res);

  sendResponse(res, {
    statusCode: 200,
    message: 'Logged out successfully.'
  });
});

export const logoutAll = asyncHandler(async (req, res) => {
  await AuthService.logoutAllDevices({
    userId: req.user._id
  });

  clearRefreshTokenCookie(res);

  sendResponse(res, {
    statusCode: 200,
    message: 'Logged out from all active devices successfully.'
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await AuthService.forgotPassword({
    email: req.body.email
  });

  sendResponse(res, {
    statusCode: 200,
    message: result.message
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  const result = await AuthService.resetPassword({
    email: req.body.email,
    token: req.body.token,
    newPassword: req.body.newPassword,
    ipAddress,
    userAgent
  });

  clearRefreshTokenCookie(res);

  sendResponse(res, {
    statusCode: 200,
    message: result.message
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  const result = await AuthService.changePassword({
    userId: req.user._id,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
    currentSessionId: req.sessionId,
    ipAddress,
    userAgent
  });

  sendResponse(res, {
    statusCode: 200,
    message: result.message
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const profile = await AuthService.getProfile({ userId: req.user._id });

  sendResponse(res, {
    statusCode: 200,
    message: 'Profile retrieved successfully.',
    data: { user: profile }
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const updatedProfile = await AuthService.updateProfile({
    userId: req.user._id,
    updates: req.body
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Profile updated successfully.',
    data: { user: updatedProfile }
  });
});

export const getSessions = asyncHandler(async (req, res) => {
  const sessions = await AuthService.listSessions({
    userId: req.user._id,
    currentSessionId: req.sessionId
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Active device sessions retrieved.',
    data: { sessions }
  });
});

export const revokeSession = asyncHandler(async (req, res) => {
  await AuthService.revokeUserSession({
    userId: req.user._id,
    sessionIdToRevoke: req.params.sessionId
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Device session revoked successfully.'
  });
});

export const requestEmailChange = asyncHandler(async (req, res) => {
  const result = await AuthService.requestEmailChange({
    userId: req.user._id,
    newEmail: req.body.newEmail,
    password: req.body.password
  });

  sendResponse(res, {
    statusCode: 200,
    message: result.message
  });
});

export const verifyEmailChange = asyncHandler(async (req, res) => {
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  const result = await AuthService.verifyEmailChange({
    userId: req.user._id,
    newEmail: req.body.newEmail,
    otp: req.body.otp,
    ipAddress,
    userAgent
  });

  sendResponse(res, {
    statusCode: 200,
    message: result.message,
    data: result.user
  });
});
