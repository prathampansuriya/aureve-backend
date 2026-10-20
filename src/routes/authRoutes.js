import express from 'express';
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  refresh,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  updateMe,
  getSessions,
  revokeSession,
  requestEmailChange,
  verifyEmailChange
} from '../controllers/authController.js';
import { authenticate, preventRoleEscalation } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { authLimiter, otpLimiter } from '../middlewares/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  requestEmailChangeSchema,
  verifyEmailChangeSchema
} from '../validators/authValidator.js';

const router = express.Router();

// 1. Customer registration with role escalation prevention
router.post(
  '/register',
  authLimiter,
  preventRoleEscalation,
  validateRequest({ body: registerSchema }),
  register
);

// 2. OTP verification and account activation
router.post(
  '/verify-otp',
  authLimiter,
  validateRequest({ body: verifyOtpSchema }),
  verifyOtp
);

// 3. Resend / Send OTP code with rate limiting
router.post(
  '/resend-otp',
  otpLimiter,
  validateRequest({ body: resendOtpSchema }),
  resendOtp
);

router.post(
  '/send-otp',
  otpLimiter,
  validateRequest({ body: resendOtpSchema }),
  resendOtp
);

// 4. Login with credential verification and rotating tokens
router.post(
  '/login',
  authLimiter,
  validateRequest({ body: loginSchema }),
  login
);

// 5. Refresh token rotation
router.post(
  '/refresh',
  refresh
);

// 6. Logout current session
router.post(
  '/logout',
  logout
);

// 7. Forgot password (non-enumerating)
router.post(
  '/forgot-password',
  authLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  forgotPassword
);

// 8. Reset password with token
router.post(
  '/reset-password',
  authLimiter,
  validateRequest({ body: resetPasswordSchema }),
  resetPassword
);

// 9. Authenticated Operations
router.post(
  '/change-password',
  authenticate,
  validateRequest({ body: changePasswordSchema }),
  changePassword
);

router.post(
  '/logout-all',
  authenticate,
  logoutAll
);

router.get(
  '/me',
  authenticate,
  getMe
);

router.patch(
  '/me',
  authenticate,
  validateRequest({ body: updateProfileSchema }),
  updateMe
);

router.get(
  '/sessions',
  authenticate,
  getSessions
);

router.delete(
  '/sessions/:sessionId',
  authenticate,
  revokeSession
);

router.post(
  '/request-email-change',
  authenticate,
  otpLimiter,
  validateRequest({ body: requestEmailChangeSchema }),
  requestEmailChange
);

router.post(
  '/verify-email-change',
  authenticate,
  authLimiter,
  validateRequest({ body: verifyEmailChangeSchema }),
  verifyEmailChange
);

export default router;
