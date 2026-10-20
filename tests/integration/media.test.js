import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';
import { User } from '../../src/models/User.js';
import { MediaService } from '../../src/services/mediaService.js';
import { isCloudinaryConfigured } from '../../src/config/cloudinary.js';

describe('AUREVÉ Cloudinary Media Management & File Security Tests', () => {
  let adminUser;
  let customerUser;
  let adminToken;
  let customerToken;
  const createdPublicIds = [];

  // Valid 1x1 PNG buffer with valid magic bytes (89 50 4E 47 ...)
  const validPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  // Valid 1x1 WebP buffer with valid magic bytes (RIFF ... WEBP)
  const validWebpBuffer = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64');

  // Valid JPEG buffer with valid magic bytes (FF D8 FF ...)
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x00, 0xff, 0xd9
  ]);

  beforeAll(async () => {
    await connectDatabase();

    await User.deleteMany({
      email: { $in: ['test_media_admin@aureve.com', 'test_media_customer@aureve.com'] }
    });

    adminUser = await User.create({
      firstName: 'Rohan',
      lastName: 'Mehta',
      email: 'test_media_admin@aureve.com',
      passwordHash: 'hashed_admin_pass_123',
      role: 'ADMIN',
      status: 'ACTIVE',
      isVerified: true
    });

    customerUser = await User.create({
      firstName: 'Pooja',
      lastName: 'Sharma',
      email: 'test_media_customer@aureve.com',
      passwordHash: 'hashed_customer_pass_123',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      isVerified: true
    });

    adminToken = jwt.sign(
      { userId: adminUser._id.toString(), email: adminUser.email, role: adminUser.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    customerToken = jwt.sign(
      { userId: customerUser._id.toString(), email: customerUser.email, role: customerUser.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  });

  afterAll(async () => {
    // Purge any media uploaded to Cloudinary during tests
    if (createdPublicIds.length > 0 && isCloudinaryConfigured()) {
      for (const id of createdPublicIds) {
        await MediaService.deleteMediaAsset(id).catch(() => {});
      }
    }

    await User.deleteMany({
      email: { $in: ['test_media_admin@aureve.com', 'test_media_customer@aureve.com'] }
    });
    await disconnectDatabase();
  });

  describe('1. Access Control & Authorization (RBAC)', () => {
    it('should reject unauthenticated upload requests with 401 TOKEN_MISSING', async () => {
      const res = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', validPngBuffer, 'emerald_choker.png');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TOKEN_MISSING');
    });

    it('should reject customer tokens with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${customerToken}`)
        .attach('file', validPngBuffer, 'emerald_choker.png');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject customer on delete endpoint with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .delete('/api/v1/media/aureve_sample_id')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Binary File Validation & Magic-Byte Inspection', () => {
    it('should reject files with fraudulent extensions (spoofed text file disguised as .jpg)', async () => {
      const fakeImageBuffer = Buffer.from('echo "Malicious script content" > hack.sh');

      const res = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', fakeImageBuffer, {
          filename: 'royal_diamond.jpg',
          contentType: 'image/jpeg'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      expect(res.body.error.message).toMatch(/binary signature validation/);
    });

    it('should reject unsupported MIME types (e.g. PDF or executable)', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 header content');

      const res = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', pdfBuffer, {
          filename: 'certificate.pdf',
          contentType: 'application/pdf'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject uploads requesting an unapproved storage folder', async () => {
      const res = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('folder', 'unauthorized_root/system_files')
        .attach('file', validPngBuffer, 'necklace.png');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Invalid storage folder/);
    });
  });

  describe('3. Single Media Upload & Responsive Transformations', () => {
    it('should stream upload a valid PNG to Cloudinary and return responsive image URLs', async () => {
      const res = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('folder', 'aureve/products')
        .field('alt', 'AUREVÉ Royal Solitaire Ring')
        .field('displayOrder', '1')
        .attach('file', validPngBuffer, 'solitaire_ring.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const asset = res.body.data.asset;
      expect(asset).toBeDefined();
      expect(asset.publicId).toBeTruthy();
      expect(asset.publicId).toMatch(/^aureve\/products\//);
      expect(asset.url).toMatch(/^https:\/\/res\.cloudinary\.com\//);
      expect(asset.mediaType).toBe('image');
      expect(asset.alt).toBe('AUREVÉ Royal Solitaire Ring');
      expect(asset.displayOrder).toBe(1);

      // Verify responsive transformation presets
      expect(asset.responsiveUrls).toBeDefined();
      expect(asset.responsiveUrls.thumbnail).toBeTruthy();
      expect(asset.responsiveUrls.card).toBeTruthy();
      expect(asset.responsiveUrls.pdp).toBeTruthy();
      expect(asset.responsiveUrls.zoom).toBeTruthy();

      createdPublicIds.push(asset.publicId);
    });

    it('should stream upload a valid JPEG to Cloudinary', async () => {
      const res = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('folder', 'aureve/categories')
        .field('alt', 'Polki Chokers Category Banner')
        .attach('file', validJpegBuffer, 'polki_choker.jpg');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.asset.publicId).toMatch(/^aureve\/categories\//);

      createdPublicIds.push(res.body.data.asset.publicId);
    });
  });

  describe('4. Multiple Media Uploads & Partial Rollback', () => {
    it('should upload multiple valid image assets preserving display order', async () => {
      const res = await request(app)
        .post('/api/v1/media/upload-multiple')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('folder', 'aureve/products')
        .attach('files', validPngBuffer, 'ring_angle_1.png')
        .attach('files', validWebpBuffer, 'ring_angle_2.webp');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(2);
      expect(Array.isArray(res.body.data.assets)).toBe(true);
      expect(res.body.data.assets.length).toBe(2);

      expect(res.body.data.assets[0].displayOrder).toBe(0);
      expect(res.body.data.assets[1].displayOrder).toBe(1);

      res.body.data.assets.forEach((a) => createdPublicIds.push(a.publicId));
    });

    it('should reject batch upload when any file fails binary validation', async () => {
      const fakeBuffer = Buffer.from('corrupt_binary_not_an_image');

      const res = await request(app)
        .post('/api/v1/media/upload-multiple')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('folder', 'aureve/products')
        .attach('files', validPngBuffer, 'valid.png')
        .attach('files', fakeBuffer, 'fake.png');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/binary signature validation/);
    });
  });

  describe('5. Media Replacement & Atomic Cleanup', () => {
    it('should upload replacement image and purge the previous asset public ID', async () => {
      // 1. Upload initial asset
      const initialRes = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('folder', 'aureve/banners')
        .attach('file', validPngBuffer, 'old_banner.png');

      const oldPublicId = initialRes.body.data.asset.publicId;
      expect(oldPublicId).toBeTruthy();

      // 2. Replace with new asset
      const replaceRes = await request(app)
        .put('/api/v1/media/replace')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('oldPublicId', oldPublicId)
        .field('folder', 'aureve/banners')
        .field('alt', 'Updated Luxury Hero Banner')
        .attach('file', validWebpBuffer, 'new_banner.webp');

      expect(replaceRes.status).toBe(200);
      expect(replaceRes.body.success).toBe(true);

      const newAsset = replaceRes.body.data.asset;
      expect(newAsset.publicId).toBeTruthy();
      expect(newAsset.publicId).not.toBe(oldPublicId);
      expect(newAsset.alt).toBe('Updated Luxury Hero Banner');

      createdPublicIds.push(newAsset.publicId);
    });
  });

  describe('6. Direct Client Upload Signatures', () => {
    it('should generate signed upload parameters without exposing the API secret', async () => {
      const res = await request(app)
        .post('/api/v1/media/signature')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          folder: 'aureve/products',
          resourceType: 'image'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.signature).toBeTruthy();
      expect(data.timestamp).toBeTypeOf('number');
      expect(data.apiKey).toBe(env.CLOUDINARY_API_KEY);
      expect(data.cloudName).toBe(env.CLOUDINARY_CLOUD_NAME);
      expect(data.folder).toBe('aureve/products');
      expect(data.uploadUrl).toMatch(/https:\/\/api\.cloudinary\.com/);

      // Verify the secret is never leaked
      expect(JSON.stringify(res.body)).not.toContain(env.CLOUDINARY_API_SECRET);
    });
  });

  describe('7. Media Deletion & Batch Cleanup', () => {
    it('should delete a single asset from Cloudinary', async () => {
      // Create asset to delete
      const uploadRes = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('folder', 'aureve/stores')
        .attach('file', validPngBuffer, 'boutique.png');

      const publicId = uploadRes.body.data.asset.publicId;

      const deleteRes = await request(app)
        .delete(`/api/v1/media/${encodeURIComponent(publicId)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
      expect(deleteRes.body.data.publicId).toBe(publicId);
    });

    it('should batch delete multiple assets from Cloudinary', async () => {
      const uploadRes1 = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('folder', 'aureve/lookbook')
        .attach('file', validPngBuffer, 'lookbook_1.png');

      const uploadRes2 = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('folder', 'aureve/lookbook')
        .attach('file', validPngBuffer, 'lookbook_2.png');

      const ids = [uploadRes1.body.data.asset.publicId, uploadRes2.body.data.asset.publicId];

      const batchDeleteRes = await request(app)
        .post('/api/v1/media/batch-delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          publicIds: ids,
          resourceType: 'image'
        });

      expect(batchDeleteRes.status).toBe(200);
      expect(batchDeleteRes.body.success).toBe(true);
    });
  });
});
