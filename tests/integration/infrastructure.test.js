import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';
import { User } from '../../src/models/User.js';

describe('Production Backend Infrastructure & Security Integration Tests', () => {
  let customerUser;
  let adminUser;
  let customerToken;
  let adminToken;

  beforeAll(async () => {
    await connectDatabase();

    // Clean up any existing test accounts
    await User.deleteMany({ email: { $in: ['test_customer_infra@aureve.com', 'test_admin_infra@aureve.com'] } });

    // Seed test customer
    customerUser = await User.create({
      firstName: 'Pooja',
      lastName: 'Patel',
      email: 'test_customer_infra@aureve.com',
      passwordHash: 'hashed_password_12345678',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      isVerified: true
    });

    // Seed test admin
    adminUser = await User.create({
      firstName: 'Karan',
      lastName: 'Kapoor',
      email: 'test_admin_infra@aureve.com',
      passwordHash: 'hashed_password_87654321',
      role: 'ADMIN',
      status: 'ACTIVE',
      isVerified: true
    });

    customerToken = jwt.sign(
      { userId: customerUser._id.toString(), email: customerUser.email, role: customerUser.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    adminToken = jwt.sign(
      { userId: adminUser._id.toString(), email: adminUser.email, role: adminUser.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['test_customer_infra@aureve.com', 'test_admin_infra@aureve.com'] } });
    await disconnectDatabase();
  });

  describe('1. Zod Request Validation & Mass-Assignment Protection', () => {
    it('should return 400 VALIDATION_FAILED when payload violates schema', async () => {
      const res = await request(app)
        .post('/api/v1/test/validation')
        .send({ name: 'A', email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it('should reject unrecognized keys to prevent mass assignment on strict schemas', async () => {
      const res = await request(app)
        .post('/api/v1/test/validation')
        .send({
          name: 'Ananya Sharma',
          email: 'ananya@example.com',
          unauthorizedField: 'hacker_injected'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should block NoSQL injection operators ($ prefix) in body or query', async () => {
      const res = await request(app)
        .post('/api/v1/test/validation')
        .send({
          name: { $gt: '' },
          email: 'test@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/NoSQL injection/i);
    });

    it('should block uncontrolled pagination when limit exceeds 50', async () => {
      const res = await request(app)
        .post('/api/v1/test/validation?limit=500&page=1')
        .send({
          name: 'Tarun Tahiliani',
          email: 'tarun@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should pass cleanly when payload and query conform to schema', async () => {
      const res = await request(app)
        .post('/api/v1/test/validation?limit=25&page=1')
        .send({
          name: 'Meera Rajput',
          email: 'meera@example.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.body.name).toBe('Meera Rajput');
      expect(res.body.data.query.limit).toBe(25);
    });
  });

  describe('2. Malformed Request & Payload Limit Protection', () => {
    it('should return 400 INVALID_JSON when body contains malformed JSON syntax', async () => {
      const res = await request(app)
        .post('/api/v1/test/validation')
        .set('Content-Type', 'application/json')
        .send('{"bad_json: incomplete');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_JSON');
      expect(res.body.error.message).toMatch(/Malformed JSON/i);
    });
  });

  describe('3. CORS Behavior & Security Headers', () => {
    it('should include CORS headers for allowed client origin', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should allow preflight OPTIONS requests with x-guest-token header', async () => {
      const res = await request(app)
        .options('/api/v1/categories')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'x-guest-token');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-headers']).toMatch(/x-guest-token/i);
    });

    it('should include Helmet security headers on all responses', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-request-id']).toBeDefined();
    });
  });

  describe('4. Error Serialization & Async Error Propagation', () => {
    it('should catch unhandled async controller rejections and format standard error envelope', async () => {
      const res = await request(app).get('/api/v1/test/async-error');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(res.body.error.requestId).toBeDefined();
      expect(res.body.error.timestamp).toBeDefined();
    });
  });

  describe('5. Authentication & Authorization Primitives (RBAC)', () => {
    it('should reject unauthenticated requests with 401 TOKEN_MISSING', async () => {
      const res = await request(app).get('/api/v1/test/protected');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TOKEN_MISSING');
    });

    it('should reject invalid or forged token with 401 TOKEN_INVALID', async () => {
      const res = await request(app)
        .get('/api/v1/test/protected')
        .set('Authorization', 'Bearer forged_fake_token_value');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TOKEN_INVALID');
    });

    it('should grant access to protected route when provided valid customer token', async () => {
      const res = await request(app)
        .get('/api/v1/test/protected')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(customerUser.email);
      expect(res.body.data.user.role).toBe('CUSTOMER');
    });

    it('should reject customer token on admin-only route with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/test/admin-only')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should grant access to admin-only route when provided valid admin token', async () => {
      const res = await request(app)
        .get('/api/v1/test/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authorizedRole).toBe('ADMIN');
    });

    it('should prevent role escalation during registration by blocking elevated role submissions', async () => {
      const res = await request(app)
        .post('/api/v1/test/register-check')
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROLE_ESCALATION_BLOCKED');
    });

    it('should allow legitimate customer registration without role escalation', async () => {
      const res = await request(app)
        .post('/api/v1/test/register-check')
        .send({ role: 'CUSTOMER' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignedRole).toBe('CUSTOMER');
    });
  });
});
