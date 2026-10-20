import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { EmailOtp } from '../models/EmailOtp.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { AuditLog } from '../models/AuditLog.js';
import '../models/Address.js'; // Ensure Address model is registered for populate
import {
  hashPassword,
  comparePassword,
  generateSecureOtp,
  generateRandomToken,
  hashToken,
  generateAccessToken
} from '../utils/cryptoHelper.js';
import {
  sendVerificationOtpEmail,
  sendPasswordResetEmail,
  sendSecurityAlertEmail
} from './emailService.js';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError
} from '../utils/AppError.js';
import { env } from '../config/env.js';

export class AuthService {
  /**
   * 1. Register a new customer account and dispatch verification OTP.
   */
  static async register({ firstName, lastName, email, phone, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if account already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new AppError('An account with this email address already exists.', 409, 'CONFLICT');
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        throw new AppError('An account with this phone number already exists.', 409, 'CONFLICT');
      }
    }

    // Hash password with bcrypt work factor 12
    const passwordHash = await hashPassword(password);

    // Create unverified Customer account
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : undefined,
      passwordHash,
      role: 'CUSTOMER',
      isVerified: false,
      status: 'ACTIVE'
    });

    // Invalidate any lingering OTPs for this email and purpose
    await EmailOtp.updateMany(
      { email: normalizedEmail, purpose: 'ACCOUNT_ACTIVATION', isUsed: false },
      { isUsed: true }
    );

    // Generate cryptographically secure 6-digit OTP
    const rawOtp = generateSecureOtp();
    const otpHash = hashToken(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await EmailOtp.create({
      email: normalizedEmail,
      otpHash,
      purpose: 'ACCOUNT_ACTIVATION',
      expiresAt,
      attempts: 0,
      maxAttempts: 3
    });

    // Asynchronously dispatch luxury branded verification email
    await sendVerificationOtpEmail({
      to: normalizedEmail,
      name: `${user.firstName} ${user.lastName}`,
      otp: rawOtp,
      expiresMinutes: 10
    });

    return {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    };
  }

  /**
   * 2. Verify OTP code and activate account or approve high-value operation.
   */
  static async verifyOtp({ email, otp, purpose = 'ACCOUNT_ACTIVATION' }) {
    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await EmailOtp.findOne({
      email: normalizedEmail,
      purpose,
      isUsed: false
    })
      .select('+otpHash')
      .sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      throw new ValidationError('Verification code is invalid or has expired. Please request a new code.');
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      otpRecord.isUsed = true;
      await otpRecord.save();
      throw new ValidationError('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    const computedHash = hashToken(otp.trim());
    if (computedHash !== otpRecord.otpHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = otpRecord.maxAttempts - otpRecord.attempts;
      throw new ValidationError(`Invalid verification code. ${remaining} attempt(s) remaining.`);
    }

    // Mark OTP consumed
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Activate user if purpose is account activation
    if (purpose === 'ACCOUNT_ACTIVATION') {
      await User.findOneAndUpdate({ email: normalizedEmail }, { isVerified: true });
    }

    return {
      verified: true,
      email: normalizedEmail,
      purpose
    };
  }

  /**
   * 3. Resend OTP with 60-second rate-limiting throttle.
   */
  static async resendOtp({ email, purpose = 'ACCOUNT_ACTIVATION' }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Find any OTP sent within the last 60 seconds for throttling
    const recentOtp = await EmailOtp.findOne({
      email: normalizedEmail,
      purpose,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
    });

    if (recentOtp) {
      throw new AppError(
        'Please wait at least 60 seconds before requesting another verification code.',
        429,
        'OTP_THROTTLED'
      );
    }

    const user = await User.findOne({ email: normalizedEmail });

    // Invalidate existing active OTPs
    await EmailOtp.updateMany({ email: normalizedEmail, purpose, isUsed: false }, { isUsed: true });

    const rawOtp = generateSecureOtp();
    const otpHash = hashToken(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await EmailOtp.create({
      email: normalizedEmail,
      otpHash,
      purpose,
      expiresAt,
      attempts: 0,
      maxAttempts: 3
    });

    await sendVerificationOtpEmail({
      to: normalizedEmail,
      name: user ? user.fullName : 'Valued Client',
      otp: rawOtp,
      expiresMinutes: 10
    });

    return {
      message: 'Verification code has been dispatched to your email.'
    };
  }

  /**
   * 4. Login with credential validation, lockout defense, session tracking, and rotating tokens.
   */
  static async login({ email, password, deviceFingerprint = 'generic', userAgent = 'unknown', ipAddress = 'unknown' }) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    // Generic error message to prevent user enumeration
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    // Check account lockout status
    if (user.isLocked()) {
      const minutesRemaining = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      throw new ForbiddenError(
        `Account is temporarily locked due to consecutive failed logins. Please try again in ${minutesRemaining} minute(s).`,
        'ACCOUNT_LOCKED'
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError(`Your account is currently ${user.status.toLowerCase()}. Access denied.`, 'ACCOUNT_INACTIVE');
    }

    // Validate password
    const isPasswordMatch = await comparePassword(password, user.passwordHash);
    if (!isPasswordMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lock
      }
      await user.save();
      throw new UnauthorizedError('Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    // Reset failed login attempts upon successful password match
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    // Generate cryptographic refresh token
    const rawRefreshToken = generateRandomToken(40);
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await Session.create({
      userId: user._id,
      tokenHash,
      deviceFingerprint,
      userAgent,
      ipAddress,
      expiresAt
    });

    // Generate 15-minute JWT access token bound to session
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId: session._id.toString()
    });

    return {
      accessToken,
      rawRefreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    };
  }

  /**
   * 5. Refresh token rotation with reuse breach detection (Family Revocation).
   */
  static async rotateRefreshToken({ rawRefreshToken, deviceFingerprint = 'generic', userAgent = 'unknown', ipAddress = 'unknown' }) {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token is required.', 'TOKEN_MISSING');
    }

    const incomingHash = hashToken(rawRefreshToken);

    // Look for matching session
    const activeSession = await Session.findOne({ tokenHash: incomingHash });

    if (!activeSession) {
      // Check if this token was already rotated/replaced (Token Reuse Attack Detection)
      const compromisedSession = await Session.findOne({ replacedByTokenHash: incomingHash });

      if (compromisedSession) {
        // SECURITY BREACH: Token replay detected! Invalidate ALL sessions for this user.
        await Session.updateMany({ userId: compromisedSession.userId }, { isRevoked: true });

        await AuditLog.create({
          action: 'TOKEN_REUSE_BREACH_DETECTED',
          entity: 'Session',
          entityId: compromisedSession._id,
          performedBy: compromisedSession.userId,
          ipAddress,
          userAgent,
          changes: { before: { active: true }, after: { revokedAll: true } }
        });

        throw new UnauthorizedError(
          'Security alert: Compromised or reused refresh token detected. All active sessions have been revoked.',
          'TOKEN_REUSE_DETECTED'
        );
      }

      throw new UnauthorizedError('Session expired or invalid. Please log in again.', 'SESSION_EXPIRED');
    }

    // If session is already marked revoked or expired
    if (activeSession.isRevoked || activeSession.expiresAt < new Date()) {
      if (activeSession.replacedByTokenHash) {
        // Replayed old token!
        await Session.updateMany({ userId: activeSession.userId }, { isRevoked: true });

        await AuditLog.create({
          action: 'TOKEN_REUSE_BREACH_DETECTED',
          entity: 'Session',
          entityId: activeSession._id,
          performedBy: activeSession.userId,
          ipAddress,
          userAgent,
          changes: { before: { active: false }, after: { revokedAll: true } }
        });

        throw new UnauthorizedError(
          'Security alert: Compromised or reused refresh token detected. All active sessions have been revoked.',
          'TOKEN_REUSE_DETECTED'
        );
      }
      throw new UnauthorizedError('Session has expired or was revoked. Please log in again.', 'SESSION_EXPIRED');
    }

    // Verify user is still active
    const user = await User.findById(activeSession.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is inactive or disabled.', 'ACCOUNT_INACTIVE');
    }

    // Generate new rotated refresh token
    const newRawRefreshToken = generateRandomToken(40);
    const newHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Revoke old session and link to child token
    activeSession.isRevoked = true;
    activeSession.replacedByTokenHash = newHash;
    await activeSession.save();

    // Create fresh child session
    const newSession = await Session.create({
      userId: user._id,
      tokenHash: newHash,
      deviceFingerprint: deviceFingerprint || activeSession.deviceFingerprint,
      userAgent: userAgent || activeSession.userAgent,
      ipAddress: ipAddress || activeSession.ipAddress,
      expiresAt: newExpiresAt
    });

    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId: newSession._id.toString()
    });

    return {
      newAccessToken,
      newRawRefreshToken
    };
  }

  /**
   * 6. Logout single device session.
   */
  static async logout({ rawRefreshToken, sessionId }) {
    if (rawRefreshToken) {
      const incomingHash = hashToken(rawRefreshToken);
      await Session.findOneAndUpdate({ tokenHash: incomingHash }, { isRevoked: true });
    } else if (sessionId) {
      await Session.findByIdAndUpdate(sessionId, { isRevoked: true });
    }
    return { success: true };
  }

  /**
   * 7. Logout from all devices for this user.
   */
  static async logoutAllDevices({ userId }) {
    await Session.updateMany({ userId, isRevoked: false }, { isRevoked: true });
    return { success: true };
  }

  /**
   * 8. Forgot password request (non-enumerating).
   */
  static async forgotPassword({ email }) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Non-enumerating generic response
    if (!user) {
      return {
        message: 'If an account exists with this email address, password reset instructions have been dispatched.'
      };
    }

    // Invalidate existing unused password reset tokens
    await PasswordResetToken.updateMany({ userId: user._id, isUsed: false }, { isUsed: true });

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      isUsed: false
    });

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

    await sendPasswordResetEmail({
      to: normalizedEmail,
      name: user.fullName,
      resetUrl,
      expiresMinutes: 60
    });

    return {
      message: 'If an account exists with this email address, password reset instructions have been dispatched.'
    };
  }

  /**
   * 9. Reset password with token, revoking all existing sessions.
   */
  static async resetPassword({ email, token, newPassword, ipAddress = 'unknown', userAgent = 'unknown' }) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw new ValidationError('Password reset token is invalid or has expired.');
    }

    const computedHash = hashToken(token.trim());
    const resetRecord = await PasswordResetToken.findOne({
      userId: user._id,
      tokenHash: computedHash,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!resetRecord) {
      throw new ValidationError('Password reset token is invalid or has expired.');
    }

    // Hash new password and update user
    user.passwordHash = await hashPassword(newPassword);
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // Consume reset token
    resetRecord.isUsed = true;
    await resetRecord.save();

    // SECURITY INVARIANT: Revoke ALL active sessions across all devices
    await Session.updateMany({ userId: user._id, isRevoked: false }, { isRevoked: true });

    // Audit and dispatch alert email
    await AuditLog.create({
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'User',
      entityId: user._id,
      performedBy: user._id,
      ipAddress,
      userAgent,
      changes: { before: { passwordReset: true }, after: { sessionsRevoked: true } }
    });

    await sendSecurityAlertEmail({
      to: normalizedEmail,
      name: user.fullName,
      alertType: 'Password Reset Completed',
      ipAddress,
      userAgent
    });

    return {
      message: 'Your password has been successfully reset. All active sessions have been terminated for security.'
    };
  }

  /**
   * 10. Change password for an authenticated user.
   */
  static async changePassword({ userId, currentPassword, newPassword, currentSessionId, ipAddress = 'unknown', userAgent = 'unknown' }) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect.', 'INVALID_CREDENTIALS');
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    // Revoke all OTHER sessions except the current one
    if (currentSessionId) {
      await Session.updateMany({ userId, _id: { $ne: currentSessionId }, isRevoked: false }, { isRevoked: true });
    }

    await sendSecurityAlertEmail({
      to: user.email,
      name: user.fullName,
      alertType: 'Password Changed',
      ipAddress,
      userAgent
    });

    return {
      message: 'Password changed successfully. Other active sessions have been terminated.'
    };
  }

  /**
   * 11. List active device sessions for current user.
   */
  static async listSessions({ userId, currentSessionId }) {
    const sessions = await Session.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    }).sort({ lastActiveAt: -1 });

    return sessions.map((s) => ({
      sessionId: s._id,
      deviceFingerprint: s.deviceFingerprint,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      lastActiveAt: s.lastActiveAt,
      isCurrent: s._id.toString() === (currentSessionId?.toString() || '')
    }));
  }

  /**
   * 12. Revoke a specific session.
   */
  static async revokeSession({ userId, sessionIdToRevoke }) {
    const session = await Session.findOne({ _id: sessionIdToRevoke, userId });
    if (!session) {
      throw new NotFoundError('Session record not found.');
    }
    session.isRevoked = true;
    await session.save();
    return { success: true };
  }

  static async revokeUserSession({ userId, sessionIdToRevoke }) {
    return this.revokeSession({ userId, sessionIdToRevoke });
  }

  /**
   * 13. Get user profile.
   */
  static async getProfile({ userId }) {
    const user = await User.findById(userId)
      .populate('defaultShippingAddress')
      .populate('defaultBillingAddress');
    if (!user) throw new NotFoundError('User not found.');
    return user;
  }

  /**
   * 14. Update user profile.
   */
  static async updateProfile({ userId, updates }) {
    const allowedUpdates = {};
    if (updates.firstName) allowedUpdates.firstName = updates.firstName.trim();
    if (updates.lastName) allowedUpdates.lastName = updates.lastName.trim();
    if (updates.phone) allowedUpdates.phone = updates.phone.trim();
    if (updates.preferences) allowedUpdates.preferences = updates.preferences;

    const user = await User.findByIdAndUpdate(userId, { $set: allowedUpdates }, { new: true, runValidators: true });
    if (!user) throw new NotFoundError('User not found.');
    return user;
  }

  /**
   * 15. Request Email Change Verification.
   */
  static async requestEmailChange({ userId, newEmail, password }) {
    const normalizedNewEmail = newEmail.toLowerCase().trim();

    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    // Verify current identity with password
    const isPasswordMatch = await comparePassword(password, user.passwordHash);
    if (!isPasswordMatch) {
      throw new UnauthorizedError('Current password is incorrect.', 'INVALID_CREDENTIALS');
    }

    if (user.email === normalizedNewEmail) {
      throw new ValidationError('New email address must be different from current email address.');
    }

    const existingUser = await User.findOne({ email: normalizedNewEmail });
    if (existingUser) {
      throw new AppError('An account with this email address already exists.', 409, 'CONFLICT');
    }

    // Rate-limit throttle (60s)
    const recentOtp = await EmailOtp.findOne({
      email: normalizedNewEmail,
      purpose: 'EMAIL_CHANGE',
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
    });

    if (recentOtp) {
      throw new AppError(
        'Please wait at least 60 seconds before requesting another email verification code.',
        429,
        'OTP_THROTTLED'
      );
    }

    // Invalidate existing unused OTPs for this newEmail & purpose
    await EmailOtp.updateMany({ email: normalizedNewEmail, purpose: 'EMAIL_CHANGE', isUsed: false }, { isUsed: true });

    const rawOtp = generateSecureOtp();
    const otpHash = hashToken(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await EmailOtp.create({
      email: normalizedNewEmail,
      otpHash,
      purpose: 'EMAIL_CHANGE',
      expiresAt,
      attempts: 0,
      maxAttempts: 3
    });

    await sendVerificationOtpEmail({
      to: normalizedNewEmail,
      name: user.fullName,
      otp: rawOtp,
      expiresMinutes: 10
    });

    return {
      message: `A verification code has been dispatched to ${normalizedNewEmail}.`
    };
  }

  /**
   * 16. Verify Email Change and Update Account.
   */
  static async verifyEmailChange({ userId, newEmail, otp, ipAddress = 'unknown', userAgent = 'unknown' }) {
    const normalizedNewEmail = newEmail.toLowerCase().trim();

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const otpRecord = await EmailOtp.findOne({
      email: normalizedNewEmail,
      purpose: 'EMAIL_CHANGE',
      isUsed: false
    })
      .select('+otpHash')
      .sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      throw new ValidationError('Verification code is invalid or has expired. Please request a new code.');
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      otpRecord.isUsed = true;
      await otpRecord.save();
      throw new ValidationError('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    const computedHash = hashToken(otp.trim());
    if (computedHash !== otpRecord.otpHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = otpRecord.maxAttempts - otpRecord.attempts;
      throw new ValidationError(`Invalid verification code. ${remaining} attempt(s) remaining.`);
    }

    // Mark OTP consumed
    otpRecord.isUsed = true;
    await otpRecord.save();

    const oldEmail = user.email;

    // Check again for conflict
    const conflictUser = await User.findOne({ email: normalizedNewEmail, _id: { $ne: user._id } });
    if (conflictUser) {
      throw new AppError('An account with this email address already exists.', 409, 'CONFLICT');
    }

    user.email = normalizedNewEmail;
    user.isVerified = true;
    await user.save();

    await AuditLog.create({
      action: 'EMAIL_CHANGE_VERIFIED',
      entity: 'User',
      entityId: user._id,
      performedBy: user._id,
      ipAddress,
      userAgent,
      changes: { before: { email: oldEmail }, after: { email: normalizedNewEmail } }
    });

    // Alert old email address regarding the change
    await sendSecurityAlertEmail({
      to: oldEmail,
      name: user.fullName,
      alertType: 'Primary Email Address Changed',
      ipAddress,
      userAgent
    });

    return {
      message: 'Email address updated successfully.',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified
      }
    };
  }
}
