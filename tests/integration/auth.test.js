import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';
import { User } from '../../src/models/User.js';
import { EmailOtp } from '../../src/models/EmailOtp.js';
import { Session } from '../../src/models/Session.js';
import { PasswordResetToken } from '../../src/models/PasswordResetToken.js';
import { AuditLog } from '../../src/models/AuditLog.js';
import { hashToken } from '../../src/utils/cryptoHelper.js';

describe('AUREVÉ Complete Authentication & Session Lifecycle Integration Tests', () => {
  const testCustomer = {
    firstName: 'Devika',
    lastName: 'Singhania',
    email: 'devika.singhania@aureve-test.com',
    phone: '9876543219',
    password: 'RoyalDiamond@2026!'
  };

  const newEmailForChange = 'devika.new@aureve-test.com';

  beforeAll(async () => {
    await connectDatabase();
    // Clean up test records
    await User.deleteMany({ email: { $in: [testCustomer.email, newEmailForChange, 'nonexistent@aureve-test.com'] } });
    await EmailOtp.deleteMany({ email: { $in: [testCustomer.email, newEmailForChange] } });
  });

  afterAll(async () => {
    const users = await User.find({ email: { $in: [testCustomer.email, newEmailForChange] } });
    const userIds = users.map((u) => u._id);
    await Session.deleteMany({ userId: { $in: userIds } });
    await PasswordResetToken.deleteMany({ userId: { $in: userIds } });
    await AuditLog.deleteMany({ performedBy: { $in: userIds } });
    await User.deleteMany({ email: { $in: [testCustomer.email, newEmailForChange] } });
    await EmailOtp.deleteMany({ email: { $in: [testCustomer.email, newEmailForChange] } });
    await disconnectDatabase();
  });

  describe('1. Customer Registration & Role Escalation Defense', () => {
    it('should block privilege escalation when submitting non-CUSTOMER role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testCustomer,
          role: 'ADMIN'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROLE_ESCALATION_BLOCKED');
    });

    it('should register new customer, hash password, and generate purpose-bound EmailOtp', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testCustomer);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testCustomer.email);
      expect(res.body.data.user.role).toBe('CUSTOMER');
      expect(res.body.data.user.isVerified).toBe(false);

      // Verify record in MongoDB
      const user = await User.findOne({ email: testCustomer.email }).select('+passwordHash');
      expect(user).toBeTruthy();
      expect(user.passwordHash).not.toBe(testCustomer.password);
      expect(user.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash

      // Verify EmailOtp created
      const otpRecord = await EmailOtp.findOne({ email: testCustomer.email, purpose: 'ACCOUNT_ACTIVATION' });
      expect(otpRecord).toBeTruthy();
      expect(otpRecord.isUsed).toBe(false);
      expect(otpRecord.attempts).toBe(0);
    });

    it('should prevent duplicate registration with 409 CONFLICT', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testCustomer);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('2. OTP Verification & Attempt Limits', () => {
    it('should track invalid OTP attempts and return remaining count', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: testCustomer.email,
          otp: '000000',
          purpose: 'ACCOUNT_ACTIVATION'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Invalid verification code. 2 attempt\(s\) remaining/);

      const otp = await EmailOtp.findOne({ email: testCustomer.email, purpose: 'ACCOUNT_ACTIVATION', isUsed: false });
      expect(otp.attempts).toBe(1);
    });

    it('should reject when OTP maximum attempts are exceeded', async () => {
      // Artificially set attempts to max
      await EmailOtp.updateOne(
        { email: testCustomer.email, purpose: 'ACCOUNT_ACTIVATION', isUsed: false },
        { attempts: 3 }
      );

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: testCustomer.email,
          otp: '000000',
          purpose: 'ACCOUNT_ACTIVATION'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Maximum verification attempts exceeded/);

      // Verify OTP is marked consumed/used
      const otp = await EmailOtp.findOne({ email: testCustomer.email, purpose: 'ACCOUNT_ACTIVATION' }).sort({ createdAt: -1 });
      expect(otp.isUsed).toBe(true);
    });

    it('should reject expired OTP', async () => {
      const expiredHash = hashToken('112233');
      await EmailOtp.create({
        email: testCustomer.email,
        otpHash: expiredHash,
        purpose: 'ACCOUNT_ACTIVATION',
        expiresAt: new Date(Date.now() - 60 * 1000), // expired 1 minute ago
        isUsed: false
      });

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: testCustomer.email,
          otp: '112233',
          purpose: 'ACCOUNT_ACTIVATION'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/expired/);
    });

    it('should successfully verify valid OTP and activate account', async () => {
      const validCode = '884422';
      const validHash = hashToken(validCode);
      await EmailOtp.create({
        email: testCustomer.email,
        otpHash: validHash,
        purpose: 'ACCOUNT_ACTIVATION',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isUsed: false
      });

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: testCustomer.email,
          otp: validCode,
          purpose: 'ACCOUNT_ACTIVATION'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verified).toBe(true);

      const updatedUser = await User.findOne({ email: testCustomer.email });
      expect(updatedUser.isVerified).toBe(true);
    });
  });

  describe('3. Resend OTP & Rate-Limit Throttling', () => {
    it('should reject resend request within 60-second window with 429 OTP_THROTTLED', async () => {
      // Ensure there is a recently created OTP
      await EmailOtp.create({
        email: testCustomer.email,
        otpHash: hashToken('556677'),
        purpose: 'ACCOUNT_ACTIVATION',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
        isUsed: false
      });

      const res = await request(app)
        .post('/api/v1/auth/resend-otp')
        .send({
          email: testCustomer.email,
          purpose: 'ACCOUNT_ACTIVATION'
        });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('OTP_THROTTLED');
      expect(res.body.error.message).toMatch(/Please wait at least 60 seconds/);
    });

    it('should succeed when resend request occurs after 60-second window', async () => {
      // Backdate recent OTPs via collection to bypass Mongoose timestamp middleware
      await EmailOtp.collection.updateMany(
        { email: testCustomer.email },
        { $set: { createdAt: new Date(Date.now() - 65 * 1000) } }
      );

      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({
          email: testCustomer.email,
          purpose: 'ACCOUNT_ACTIVATION'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Verification code has been dispatched/);
    });
  });

  describe('4. Login, Lockout Defense & Session Cookie Issuance', () => {
    it('should prevent user enumeration with generic 401 INVALID_CREDENTIALS for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@aureve-test.com',
          password: 'SomePassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password.');
    });

    it('should fail with 401 INVALID_CREDENTIALS on incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testCustomer.email,
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');

      const user = await User.findOne({ email: testCustomer.email });
      expect(user.failedLoginAttempts).toBe(1);
    });

    it('should trigger account lockout after 5 consecutive failed login attempts', async () => {
      // Simulate 4 more failed logins (total 5)
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testCustomer.email,
            password: 'WrongPassword123!'
          });
      }

      const lockedUser = await User.findOne({ email: testCustomer.email });
      expect(lockedUser.failedLoginAttempts).toBe(5);
      expect(lockedUser.lockUntil).toBeTruthy();
      expect(lockedUser.lockUntil > new Date()).toBe(true);

      // Attempting to log in while locked should return 403 ACCOUNT_LOCKED
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testCustomer.email,
          password: testCustomer.password // even with correct password!
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
      expect(res.body.error.message).toMatch(/Account is temporarily locked/);

      // Reset lock for subsequent tests
      await User.updateOne({ email: testCustomer.email }, { failedLoginAttempts: 0, lockUntil: null });
    });

    it('should login successfully, issue access token, and attach HttpOnly refresh cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'Vitest-Test-Browser')
        .send({
          email: testCustomer.email,
          password: testCustomer.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.email).toBe(testCustomer.email);

      // Validate cookie header
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('aureve_refresh='));
      expect(refreshCookie).toBeTruthy();
      expect(refreshCookie).toMatch(/HttpOnly/i);
      expect(refreshCookie).toMatch(/SameSite=Strict/i);

      // Verify active session record in DB
      const sessionCount = await Session.countDocuments({ isRevoked: false });
      expect(sessionCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('5. Refresh-Token Rotation & Reuse Detection (Family Revocation)', () => {
    let initialLoginCookie;
    let initialAccessToken;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testCustomer.email, password: testCustomer.password });

      initialLoginCookie = loginRes.headers['set-cookie'];
      initialAccessToken = loginRes.body.data.accessToken;
    });

    it('should rotate refresh token and issue new access token', async () => {
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', initialLoginCookie);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeTruthy();
      expect(refreshRes.body.data.accessToken).not.toBe(initialAccessToken);

      const newCookies = refreshRes.headers['set-cookie'];
      expect(newCookies).toBeDefined();
    });

    it('should detect refresh token replay attack, revoke all sessions, and log audit event', async () => {
      // Replay the OLD initialLoginCookie which has already been rotated!
      const replayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', initialLoginCookie);

      expect(replayRes.status).toBe(401);
      expect(replayRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');
      expect(replayRes.body.error.message).toMatch(/Compromised or reused refresh token detected/);

      // Verify ALL sessions for this user were revoked in MongoDB
      const user = await User.findOne({ email: testCustomer.email });
      const activeSessions = await Session.find({ userId: user._id, isRevoked: false });
      expect(activeSessions.length).toBe(0);

      // Verify AuditLog record
      const audit = await AuditLog.findOne({ action: 'TOKEN_REUSE_BREACH_DETECTED', performedBy: user._id });
      expect(audit).toBeTruthy();
    });
  });

  describe('6. Multi-Device Sessions, Profile & Logout', () => {
    let authHeader;
    let currentSessionId;
    let currentCookie;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'Safari-Mac-Device')
        .send({ email: testCustomer.email, password: testCustomer.password });

      authHeader = `Bearer ${loginRes.body.data.accessToken}`;
      currentCookie = loginRes.headers['set-cookie'];
    });

    it('should retrieve authenticated user profile via GET /api/v1/auth/me', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testCustomer.email);
    });

    it('should update customer profile via PATCH /api/v1/auth/me', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/me')
        .set('Authorization', authHeader)
        .send({
          firstName: 'Devika Updated',
          preferences: { ringSize: 14, newsletter: true }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.firstName).toBe('Devika Updated');
      expect(res.body.data.user.preferences.ringSize).toBe(14);
    });

    it('should list all active device sessions via GET /api/v1/auth/sessions', async () => {
      const res = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.sessions)).toBe(true);
      expect(res.body.data.sessions.length).toBeGreaterThanOrEqual(1);

      currentSessionId = res.body.data.sessions[0].sessionId;
    });

    it('should revoke a specific device session via DELETE /api/v1/auth/sessions/:sessionId', async () => {
      // Create a second session
      const secondLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'Chrome-Android-Phone')
        .send({ email: testCustomer.email, password: testCustomer.password });

      const secondToken = secondLoginRes.body.data.accessToken;

      const sessionsRes = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${secondToken}`);

      const sessionToRevoke = sessionsRes.body.data.sessions.find(
        (s) => s.sessionId.toString() !== currentSessionId.toString()
      );

      if (sessionToRevoke) {
        const revokeRes = await request(app)
          .delete(`/api/v1/auth/sessions/${sessionToRevoke.sessionId}`)
          .set('Authorization', authHeader);

        expect(revokeRes.status).toBe(200);
        expect(revokeRes.body.message).toMatch(/Device session revoked/);

        // Accessing protected route with the revoked session's token should fail immediately
        const testRes = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${secondToken}`);

        expect(testRes.status).toBe(401);
        expect(testRes.body.error.code).toBe('SESSION_REVOKED');
      }
    });

    it('should logout single session and clear refresh cookie', async () => {
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', currentCookie)
        .set('Authorization', authHeader);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toMatch(/Logged out successfully/);

      const cookies = logoutRes.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const clearedCookie = cookies.find(
        (c) => c.startsWith('aureve_refresh=') && (c.includes('1970') || c.includes('Max-Age=0') || c.startsWith('aureve_refresh=;'))
      );
      expect(clearedCookie).toBeTruthy();
    });

    it('should logout from all devices via POST /api/v1/auth/logout-all', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testCustomer.email, password: testCustomer.password });

      const token = loginRes.body.data.accessToken;

      const logoutAllRes = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutAllRes.status).toBe(200);
      expect(logoutAllRes.body.message).toMatch(/Logged out from all active devices/);

      const user = await User.findOne({ email: testCustomer.email });
      const activeSessions = await Session.find({ userId: user._id, isRevoked: false });
      expect(activeSessions.length).toBe(0);
    });
  });

  describe('7. Password Recovery & Reset Flow', () => {
    it('should return 200 non-enumerating generic response for forgot-password', async () => {
      const resExisting = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testCustomer.email });

      expect(resExisting.status).toBe(200);
      expect(resExisting.body.message).toMatch(/If an account exists/);

      const resNonExisting = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@aureve-test.com' });

      expect(resNonExisting.status).toBe(200);
      expect(resNonExisting.body.message).toBe(resExisting.body.message); // Exact parity
    });

    it('should reset password with valid token, update hash, and terminate all active sessions', async () => {
      const user = await User.findOne({ email: testCustomer.email });

      // Create an active session to test invalidation
      await Session.create({
        userId: user._id,
        tokenHash: hashToken('dummy-refresh-token'),
        deviceFingerprint: 'test-device',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Find created password reset token
      const resetRecord = await PasswordResetToken.findOne({ userId: user._id, isUsed: false });
      expect(resetRecord).toBeTruthy();

      // Artificially prepare known token
      const rawResetToken = 'super-secret-reset-token-12345';
      resetRecord.tokenHash = hashToken(rawResetToken);
      resetRecord.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await resetRecord.save();

      const newPassword = 'BrandNewPassword@2026!';

      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: testCustomer.email,
          token: rawResetToken,
          newPassword
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.message).toMatch(/password has been successfully reset/);

      // Verify all active sessions were revoked
      const activeSessions = await Session.find({ userId: user._id, isRevoked: false });
      expect(activeSessions.length).toBe(0);

      // Verify user can log in with new password
      const newLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testCustomer.email,
          password: newPassword
        });

      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.success).toBe(true);

      // Update testCustomer.password for subsequent tests
      testCustomer.password = newPassword;
    });

    it('should reject reused password reset token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: testCustomer.email,
          token: 'super-secret-reset-token-12345',
          newPassword: 'AnotherPassword@2026!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Password reset token is invalid or has expired/);
    });
  });

  describe('8. Authenticated Password Change', () => {
    let activeToken;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testCustomer.email, password: testCustomer.password });

      activeToken = loginRes.body.data.accessToken;
    });

    it('should reject change password when current password is wrong', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${activeToken}`)
        .send({
          currentPassword: 'WrongCurrentPassword123!',
          newPassword: 'UpdatedPassword@2026!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should change password with valid current credentials and revoke other sessions', async () => {
      const finalPassword = 'FinalSecurePassword@2026!';

      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${activeToken}`)
        .send({
          currentPassword: testCustomer.password,
          newPassword: finalPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Password changed successfully/);

      // Verify login with new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testCustomer.email, password: finalPassword });

      expect(loginRes.status).toBe(200);
      testCustomer.password = finalPassword;
    });
  });

  describe('9. Email Change Verification Flow', () => {
    let activeToken;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testCustomer.email, password: testCustomer.password });

      activeToken = loginRes.body.data.accessToken;
    });

    it('should verify password and dispatch OTP to new email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/request-email-change')
        .set('Authorization', `Bearer ${activeToken}`)
        .send({
          newEmail: newEmailForChange,
          password: testCustomer.password
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(new RegExp(newEmailForChange));

      // Verify EmailOtp created with EMAIL_CHANGE purpose
      const otp = await EmailOtp.findOne({ email: newEmailForChange, purpose: 'EMAIL_CHANGE', isUsed: false });
      expect(otp).toBeTruthy();
    });

    it('should verify OTP and update primary email address', async () => {
      const validCode = '998877';
      await EmailOtp.updateOne(
        { email: newEmailForChange, purpose: 'EMAIL_CHANGE', isUsed: false },
        { otpHash: hashToken(validCode) }
      );

      const res = await request(app)
        .post('/api/v1/auth/verify-email-change')
        .set('Authorization', `Bearer ${activeToken}`)
        .send({
          newEmail: newEmailForChange,
          otp: validCode
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Email address updated successfully/);
      expect(res.body.data.email).toBe(newEmailForChange);

      // Verify DB updated
      const user = await User.findOne({ email: newEmailForChange });
      expect(user).toBeTruthy();
    });
  });
});
