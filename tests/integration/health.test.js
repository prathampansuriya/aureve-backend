import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';

describe('Health and Readiness Endpoints', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('GET /api/v1/health', () => {
    it('should return 200 with service health and database status', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.database.status).toBe('connected');
      expect(typeof res.body.data.uptimeSeconds).toBe('number');
    });
  });

  describe('GET /api/v1/health/readiness', () => {
    it('should return 200 when database is actively connected', async () => {
      const res = await request(app).get('/api/v1/health/readiness');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.database.status).toBe('connected');
      expect(res.body.data.database.name).toBeDefined();
    });

    it('should return 503 and error envelope when database is disconnected', async () => {
      // Temporarily disconnect
      await disconnectDatabase();

      const res = await request(app).get('/api/v1/health/readiness');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(503);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(res.body.error.database.status).toBe('disconnected');

      // Reconnect for remaining tests
      await connectDatabase();
    });
  });

  describe('404 Undefined Route Handler', () => {
    it('should return 404 with standardized error envelope for non-existent routes', async () => {
      const res = await request(app).get('/api/v1/unknown-endpoint');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(404);
      expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
      expect(res.body.error.requestId).toBeDefined();
      expect(res.body.error.timestamp).toBeDefined();
    });
  });
});
