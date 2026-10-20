import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';
import { User } from '../../src/models/User.js';
import { AuditLog } from '../../src/models/AuditLog.js';
import { Category } from '../../src/models/Category.js';
import { Collection } from '../../src/models/Collection.js';
import { Product } from '../../src/models/Product.js';
import { ProductVariant } from '../../src/models/ProductVariant.js';
import { Order } from '../../src/models/Order.js';
import { Coupon } from '../../src/models/Coupon.js';
import { Appointment } from '../../src/models/Appointment.js';
import { Review } from '../../src/models/Review.js';
import { StoreLocation } from '../../src/models/StoreLocation.js';

describe('AUREVÉ Admin Management, RBAC, Audit Logs & Database Analytics Integration Tests', () => {
  let superAdminUser;
  let adminUser;
  let staffUser;
  let customerUser;

  let superAdminToken;
  let adminToken;
  let staffToken;
  let customerToken;

  let testCategory;
  let testCollection;
  let testProduct1;
  let testVariant1;
  let testProduct2;
  let testVariant2;
  let testStore;
  let testOrder1;
  let testOrder2;
  let testRefundedOrder;
  let testCoupon;

  const testEmails = [
    'superadmin_test@aureve-test.com',
    'admin_test@aureve-test.com',
    'staff_test@aureve-test.com',
    'customer_test@aureve-test.com',
    'created_staff@aureve-test.com'
  ];

  beforeAll(async () => {
    await connectDatabase();

    // Clean up any test fixtures from previous runs
    const existingUsers = await User.find({ email: { $in: testEmails } });
    const userIds = existingUsers.map((u) => u._id);

    await AuditLog.deleteMany({
      $or: [{ performedBy: { $in: userIds } }, { 'metadata.testSuite': 'admin_rbac' }]
    });
    await Order.deleteMany({ userId: { $in: userIds } });
    await Appointment.deleteMany({ userId: { $in: userIds } });
    await Review.deleteMany({ userId: { $in: userIds } });
    await Coupon.deleteMany({ code: { $in: ['ROYAL50', 'TESTCSV20'] } });
    await ProductVariant.deleteMany({ sku: { $in: ['ADM-RING-V1', 'ADM-NECK-V1'] } });
    await Product.deleteMany({ sku: { $in: ['ADM-RING-01', 'ADM-NECK-01'] } });
    await Category.deleteMany({ slug: 'admin-test-rings' });
    await Collection.deleteMany({ slug: 'admin-test-royal' });
    await StoreLocation.deleteMany({ slug: 'admin-test-boutique' });
    await User.deleteMany({ email: { $in: testEmails } });

    // 1. Seed RBAC Users
    superAdminUser = await User.create({
      firstName: 'Vikram',
      lastName: 'Mehta',
      email: 'superadmin_test@aureve-test.com',
      phone: '9999900001',
      passwordHash: 'dummy_hash',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE'
    });

    adminUser = await User.create({
      firstName: 'Kavita',
      lastName: 'Sen',
      email: 'admin_test@aureve-test.com',
      phone: '9999900002',
      passwordHash: 'dummy_hash',
      role: 'ADMIN',
      status: 'ACTIVE'
    });

    staffUser = await User.create({
      firstName: 'Rohan',
      lastName: 'Verma',
      email: 'staff_test@aureve-test.com',
      phone: '9999900003',
      passwordHash: 'dummy_hash',
      role: 'STAFF',
      status: 'ACTIVE'
    });

    customerUser = await User.create({
      firstName: 'Pooja',
      lastName: 'Chopra',
      email: 'customer_test@aureve-test.com',
      phone: '9999900004',
      passwordHash: 'dummy_hash',
      role: 'CUSTOMER',
      status: 'ACTIVE'
    });

    // Sign Access Tokens
    superAdminToken = jwt.sign(
      { userId: superAdminUser._id.toString(), role: superAdminUser.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );
    adminToken = jwt.sign(
      { userId: adminUser._id.toString(), role: adminUser.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );
    staffToken = jwt.sign(
      { userId: staffUser._id.toString(), role: staffUser.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );
    customerToken = jwt.sign(
      { userId: customerUser._id.toString(), role: customerUser.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Seed Catalog Entities
    const mockImage = {
      url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      publicId: 'sample'
    };

    testCategory = await Category.create({
      name: 'Admin Test Rings',
      slug: 'admin-test-rings',
      description: 'Handcrafted luxury rings for test analytics',
      image: mockImage,
      isActive: true,
      displayOrder: 1
    });

    testCollection = await Collection.create({
      name: 'Admin Royal Heritage',
      slug: 'admin-test-royal',
      story: 'Exclusive heritage jewellery collection handcrafted with ancestral royal techniques.',
      tier: 'HERITAGE',
      bannerImage: mockImage,
      thumbnailImage: mockImage,
      status: 'ACTIVE'
    });

    testProduct1 = await Product.create({
      title: 'Aureve Solitaire Diamond Ring',
      slug: 'aureve-solitaire-diamond-ring',
      sku: 'ADM-RING-01',
      categoryId: testCategory._id,
      collectionIds: [testCollection._id],
      shortDescription: '18K White Gold Solitaire Diamond Ring',
      description: 'An immaculate 18K white gold solitaire diamond ring showcasing brilliant craftsmanship.',
      pricing: {
        baseMetalPricePaise: 5000000,
        makingChargesPaise: 500000,
        gstRatePercent: 3
      },
      images: [{ ...mockImage, isPrimary: true }],
      status: 'PUBLISHED'
    });

    testVariant1 = await ProductVariant.create({
      productId: testProduct1._id,
      variantName: 'Solitaire Ring Size 12',
      sku: 'ADM-RING-V1',
      size: '12',
      metalType: 'WHITE_GOLD',
      metalPurity: '18K',
      grossWeightGrams: 5.5,
      netGoldWeightGrams: 4.8,
      priceInPaise: 5665000,
      inventoryCount: 15,
      reservedCount: 0,
      lowStockThreshold: 5,
      availability: 'AVAILABLE',
      isActive: true
    });

    testProduct2 = await Product.create({
      title: 'Aureve Kundan Choker Necklace',
      slug: 'aureve-kundan-choker-necklace',
      sku: 'ADM-NECK-01',
      categoryId: testCategory._id,
      collectionIds: [testCollection._id],
      shortDescription: '22K Gold Handcrafted Choker',
      description: 'An opulent 22K yellow gold handcrafted kundan choker fit for royal occasions.',
      pricing: {
        baseMetalPricePaise: 12000000,
        makingChargesPaise: 1500000,
        gstRatePercent: 3
      },
      images: [{ ...mockImage, isPrimary: true }],
      status: 'PUBLISHED'
    });

    testVariant2 = await ProductVariant.create({
      productId: testProduct2._id,
      variantName: 'Choker Necklace Free Size',
      sku: 'ADM-NECK-V1',
      size: 'FREE_SIZE',
      metalType: 'YELLOW_GOLD',
      metalPurity: '22K',
      grossWeightGrams: 45.0,
      netGoldWeightGrams: 40.0,
      priceInPaise: 13905000,
      inventoryCount: 3, // Low stock <= threshold
      reservedCount: 0,
      lowStockThreshold: 5,
      availability: 'AVAILABLE',
      isActive: true
    });

    // 3. Seed Store Location
    testStore = await StoreLocation.create({
      name: 'Aureve Test Flagship',
      slug: 'admin-test-boutique',
      storeCode: 'AUR-ADM-01',
      addressLine: '100 Colaba Causeway',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400005',
      phone: '02222003300',
      email: 'colaba@aureve-test.com',
      appointmentConfig: { slotDurationMinutes: 60, capacityPerSlot: 2 },
      isActive: true
    });

    // 4. Seed Coupon
    testCoupon = await Coupon.create({
      code: 'ROYAL50',
      description: 'Flat ₹500 discount for royal collection',
      discountType: 'FLAT_PAISE',
      discountValue: 50000, // ₹500 in paise
      minOrderValuePaise: 1000000,
      usageCount: 2,
      usageLimitTotal: 100,
      validFrom: new Date(Date.now() - 86400000),
      validUntil: new Date(Date.now() + 86400000 * 30),
      isActive: true
    });

    // 5. Seed Orders (1 DELIVERED, 1 PROCESSING, 1 REFUNDED)
    const baseAddress = {
      name: 'Pooja Chopra',
      phone: '9999900004',
      addressLine1: 'Flat 402, Sea View',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400005',
      country: 'India'
    };

    testOrder1 = await Order.create({
      orderNumber: 'AUR-TEST-ORD-01',
      userId: customerUser._id,
      items: [
        {
          productId: testProduct1._id,
          variantId: testVariant1._id,
          title: testProduct1.title,
          sku: testVariant1.sku,
          quantity: 2,
          unitPricePaise: 5665000,
          totalPaise: 11330000,
          image: mockImage.url
        }
      ],
      shippingAddress: baseAddress,
      billingAddress: baseAddress,
      paymentMethod: 'COD',
      paymentStatus: 'PAID',
      orderStatus: 'DELIVERED',
      financialBreakdown: {
        subtotalPaise: 11000000,
        makingChargesPaise: 0,
        gstPaise: 330000,
        discountPaise: 0,
        shippingFeePaise: 0,
        grandTotalPaise: 11330000
      },
      createdAt: new Date()
    });

    testOrder2 = await Order.create({
      orderNumber: 'AUR-TEST-ORD-02',
      userId: customerUser._id,
      items: [
        {
          productId: testProduct2._id,
          variantId: testVariant2._id,
          title: testProduct2.title,
          sku: testVariant2.sku,
          quantity: 1,
          unitPricePaise: 13905000,
          totalPaise: 13905000,
          image: mockImage.url
        }
      ],
      shippingAddress: baseAddress,
      billingAddress: baseAddress,
      paymentMethod: 'RAZORPAY',
      paymentStatus: 'PAID',
      orderStatus: 'PROCESSING',
      financialBreakdown: {
        subtotalPaise: 13500000,
        makingChargesPaise: 0,
        gstPaise: 405000,
        discountPaise: 50000,
        shippingFeePaise: 0,
        grandTotalPaise: 13855000
      },
      couponApplied: {
        code: 'ROYAL50',
        discountPaise: 50000
      },
      createdAt: new Date()
    });

    testRefundedOrder = await Order.create({
      orderNumber: 'AUR-TEST-ORD-REF',
      userId: customerUser._id,
      items: [
        {
          productId: testProduct1._id,
          variantId: testVariant1._id,
          title: testProduct1.title,
          sku: testVariant1.sku,
          quantity: 1,
          unitPricePaise: 5665000,
          totalPaise: 5665000,
          image: mockImage.url
        }
      ],
      shippingAddress: baseAddress,
      billingAddress: baseAddress,
      paymentMethod: 'RAZORPAY',
      paymentStatus: 'REFUNDED',
      orderStatus: 'REFUNDED',
      financialBreakdown: {
        subtotalPaise: 5500000,
        makingChargesPaise: 0,
        gstPaise: 165000,
        discountPaise: 0,
        shippingFeePaise: 0,
        grandTotalPaise: 5665000
      },
      cancellation: {
        reason: 'Customer requested cancellation prior to dispatch',
        refundId: 'rfnd_test12345',
        refundAmountPaise: 5665000,
        processedAt: new Date()
      },
      createdAt: new Date()
    });

    // 6. Seed Appointment
    const apptDate = new Date();
    apptDate.setDate(apptDate.getDate() + 3);
    await Appointment.create({
      userId: customerUser._id,
      storeLocationId: testStore._id,
      appointmentType: 'IN_STORE_VIP',
      scheduledDate: apptDate,
      timeSlot: '11:00-12:00',
      status: 'CONFIRMED',
      clientName: 'Pooja Chopra',
      clientEmail: 'customer_test@aureve-test.com',
      clientPhone: '9999900004'
    });

    // 7. Seed Review
    await Review.create({
      userId: customerUser._id,
      productId: testProduct1._id,
      orderId: testOrder1._id,
      rating: 5,
      title: 'Majestic diamond craftsmanship',
      comment: 'Breathtaking clarity and brilliant sparkle.',
      status: 'PENDING'
    });
  });

  afterAll(async () => {
    const existingUsers = await User.find({ email: { $in: testEmails } });
    const userIds = existingUsers.map((u) => u._id);

    await AuditLog.deleteMany({ performedBy: { $in: userIds } });
    await Order.deleteMany({ userId: { $in: userIds } });
    await Appointment.deleteMany({ userId: { $in: userIds } });
    await Review.deleteMany({ userId: { $in: userIds } });
    await Coupon.deleteMany({ code: { $in: ['ROYAL50', 'TESTCSV20'] } });
    await ProductVariant.deleteMany({ sku: { $in: ['ADM-RING-V1', 'ADM-NECK-V1'] } });
    await Product.deleteMany({ sku: { $in: ['ADM-RING-01', 'ADM-NECK-01'] } });
    await Category.deleteMany({ slug: 'admin-test-rings' });
    await Collection.deleteMany({ slug: 'admin-test-royal' });
    await StoreLocation.deleteMany({ slug: 'admin-test-boutique' });
    await User.deleteMany({ email: { $in: testEmails } });

    await disconnectDatabase();
  });

  // =========================================================================
  // 1. RBAC & AUTHORIZATION ENFORCEMENT
  // =========================================================================
  describe('1. Server-Side RBAC Enforcement on Administrative Endpoints', () => {
    it('rejects unauthenticated requests to /api/v1/admin/users with 401', async () => {
      const res = await request(app).get('/api/v1/admin/users');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects customer requests to /api/v1/admin/users with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/forbidden|access denied/i);
    });

    it('rejects staff requests to financial analytics with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/overview')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows staff to access appointment analytics queue', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/appointments')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics).toBeDefined();
    });

    it('allows staff to access review moderation queue analytics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/reviews')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics).toBeDefined();
    });

    it('rejects admin from inspecting audit logs with 403 (Super-Admin only)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects admin from modifying user roles with 403 (Super-Admin only)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${customerUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'STAFF', reason: 'Attempted unauthorized promotion' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows Super Admin full access to audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.auditLogs).toBeInstanceOf(Array);
      expect(res.body.data.pagination).toBeDefined();
    });
  });

  // =========================================================================
  // 2. ADMINISTRATIVE USER MANAGEMENT & AUDIT LOGGING
  // =========================================================================
  describe('2. Administrative User Management & Mutation Audit Records', () => {
    let createdStaffId;

    it('Super Admin provisions a new staff user with password hashing and audit log', async () => {
      const res = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          firstName: 'Anand',
          lastName: 'Piramal',
          email: 'created_staff@aureve-test.com',
          password: 'Password@123',
          phone: '9999900005',
          role: 'STAFF',
          reason: 'Showroom concierge onboarding'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('created_staff@aureve-test.com');
      expect(res.body.data.user.role).toBe('STAFF');
      expect(res.body.data.user.passwordHash).toBeUndefined();

      createdStaffId = res.body.data.user._id;

      // Verify audit log entry was created
      const audit = await AuditLog.findOne({
        action: 'ADMIN_USER_CREATED',
        entityId: createdStaffId
      });
      expect(audit).not.toBeNull();
      expect(audit.performedBy.toString()).toBe(superAdminUser._id.toString());
      expect(audit.metadata.role).toBe('STAFF');
    });

    it('Super Admin promotes staff user to ADMIN with immutable audit log', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${createdStaffId}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          role: 'ADMIN',
          reason: 'Promotion to operations manager'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('ADMIN');

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'USER_ROLE_CHANGED',
        entityId: createdStaffId
      });
      expect(audit).not.toBeNull();
      expect(audit.changes.before.role).toBe('STAFF');
      expect(audit.changes.after.role).toBe('ADMIN');
      expect(audit.metadata.reason).toBe('Promotion to operations manager');
    });

    it('prevents Super Admin from demoting self', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${superAdminUser._id}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          role: 'CUSTOMER',
          reason: 'Self demotion attempt'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot demote|cannot change your own/i);
    });

    it('Admin modifies customer status to SUSPENDED with audit log', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${customerUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'SUSPENDED',
          reason: 'Security verification pending'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.status).toBe('SUSPENDED');

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'USER_STATUS_UPDATED',
        entityId: customerUser._id
      });
      expect(audit).not.toBeNull();
      expect(audit.performedBy.toString()).toBe(adminUser._id.toString());
      expect(audit.changes.after.status).toBe('SUSPENDED');

      // Restore to ACTIVE for subsequent tests
      await request(app)
        .patch(`/api/v1/admin/users/${customerUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE', reason: 'Verification completed' });
    });

    it('Admin lists users with search, role filter and pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?role=CUSTOMER&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeInstanceOf(Array);
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data.users[0].role).toBe('CUSTOMER');
    });

    it('Admin retrieves comprehensive customer profile with order & appointment stats', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/users/${customerUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user._id).toBe(customerUser._id.toString());
      expect(res.body.data.summary.totalOrders).toBe(3);
      expect(res.body.data.summary.totalAppointments).toBe(1);
      expect(res.body.data.orders).toBeInstanceOf(Array);
      expect(res.body.data.appointments).toBeInstanceOf(Array);
    });
  });

  // =========================================================================
  // 3. DATABASE-BACKED ANALYTICS & EXECUTIVE DASHBOARD
  // =========================================================================
  describe('3. Database-Backed Analytics & Aggregation Pipelines', () => {
    it('returns authoritative overview metrics matching seeded data', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const metrics = res.body.data.overview;

      // 3 orders placed: 1 DELIVERED (11,330,000 paise), 1 PROCESSING (13,855,000 paise), 1 REFUNDED (5,665,000 paise)
      // Gross Revenue: 11,330,000 + 13,855,000 + 5,665,000 = 30,850,000 paise
      // Refunded: 5,665,000 paise
      // Net Revenue: 30,850,000 - 5,665,000 = 25,185,000 paise
      expect(metrics.grossRevenuePaise).toBeGreaterThanOrEqual(30850000);
      expect(metrics.refundedPaise).toBeGreaterThanOrEqual(5665000);
      expect(metrics.netRevenuePaise).toBeGreaterThanOrEqual(25185000);
      expect(metrics.totalOrders).toBeGreaterThanOrEqual(3);
      expect(metrics.averageOrderValuePaise).toBeGreaterThan(0);
      expect(metrics.lowStockCount).toBeGreaterThanOrEqual(1); // testVariant2 has 3 <= threshold 5
    });

    it('returns sales trend time series aggregated by day', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/sales-trend?interval=day')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trends).toBeInstanceOf(Array);
      expect(res.body.data.trends.length).toBeGreaterThanOrEqual(1);

      const latestPoint = res.body.data.trends[res.body.data.trends.length - 1];
      expect(latestPoint.date).toBeDefined();
      expect(latestPoint.grossRevenuePaise).toBeGreaterThanOrEqual(0);
      expect(latestPoint.orderCount).toBeGreaterThanOrEqual(1);
    });

    it('returns order status breakdown with counts and totals', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/order-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const breakdown = res.body.data.breakdown;
      expect(breakdown).toBeInstanceOf(Array);

      const delivered = breakdown.find((b) => b._id === 'DELIVERED');
      expect(delivered).toBeDefined();
      expect(delivered.count).toBeGreaterThanOrEqual(1);

      const processing = breakdown.find((b) => b._id === 'PROCESSING');
      expect(processing).toBeDefined();
      expect(processing.count).toBeGreaterThanOrEqual(1);
    });

    it('returns top products ranked by units sold and revenue', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/top-products?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.topProducts).toBeInstanceOf(Array);
      expect(res.body.data.topProducts.length).toBeGreaterThanOrEqual(1);

      const firstProduct = res.body.data.topProducts[0];
      expect(firstProduct.title).toBeDefined();
      expect(firstProduct.totalUnitsSold).toBeGreaterThanOrEqual(1);
      expect(firstProduct.totalRevenuePaise).toBeGreaterThanOrEqual(1);
    });

    it('returns category performance metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categories).toBeInstanceOf(Array);

      const ringCat = res.body.data.categories.find((c) => c.name === 'Admin Test Rings');
      expect(ringCat).toBeDefined();
      expect(ringCat.totalRevenuePaise).toBeGreaterThan(0);
      expect(ringCat.unitsSold).toBeGreaterThan(0);
    });

    it('returns inventory report with low-stock list and total valuation', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/inventory?limit=200')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { lowStockItems, totalInventoryUnits, totalInventoryValuationPaise } = res.body.data.inventory;

      expect(totalInventoryUnits).toBeGreaterThanOrEqual(18); // 15 + 3
      expect(totalInventoryValuationPaise).toBeGreaterThan(0);
      expect(lowStockItems).toBeInstanceOf(Array);

      // testVariant2 (stock: 3, threshold: 5) must be in lowStockItems
      const foundLowStock = lowStockItems.find((i) => i.sku === 'ADM-NECK-V1');
      expect(foundLowStock).toBeDefined();
      expect(foundLowStock.inventoryCount).toBe(3);
    });

    it('returns customer growth and acquisition trends', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.totalCustomers).toBeGreaterThanOrEqual(1);
      expect(res.body.data.growthTrend).toBeInstanceOf(Array);
    });

    it('returns coupon performance and total discounts granted', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/coupons')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { coupons } = res.body.data;
      expect(coupons).toBeInstanceOf(Array);

      const royalCoupon = coupons.find((c) => c.code === 'ROYAL50');
      expect(royalCoupon).toBeDefined();
      expect(royalCoupon.usageCount).toBe(2);
    });

    it('returns refund totals and financial impact', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/refunds')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { summary, refundHistory } = res.body.data;

      expect(summary.totalRefunds).toBeGreaterThanOrEqual(1);
      expect(summary.totalRefundAmountPaise).toBeGreaterThanOrEqual(5665000);
      expect(refundHistory).toBeInstanceOf(Array);
      expect(refundHistory[0].orderNumber).toBe('AUR-TEST-ORD-REF');
    });

    it('returns appointment activity metrics with status breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/appointments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const metrics = res.body.data.metrics;
      expect(metrics.totalAppointments).toBeGreaterThanOrEqual(1);
      expect(metrics.statusBreakdown.CONFIRMED).toBeGreaterThanOrEqual(1);
    });

    it('returns review moderation queue metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/reviews')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const metrics = res.body.data.metrics;
      expect(metrics.pendingModerationCount).toBeGreaterThanOrEqual(1);
      expect(metrics.totalReviews).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 4. BOUNDED CSV REPORT EXPORTS WITH INJECTION SAFEGUARDS
  // =========================================================================
  describe('4. Bounded CSV Report Exports & Formula Injection Defenses', () => {
    it('exports orders report as sanitized CSV with correct headers and attachment filename', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/orders?limit=100')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="aureve-orders-report-.*\.csv"/);

      // Verify CSV content structure
      const csvText = res.text;
      const lines = csvText.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2);

      const header = lines[0];
      expect(header).toContain('Order Number');
      expect(header).toContain('Grand Total (INR)');
      expect(header).toContain('Order Status');

      // Verify at least one test order is present in the CSV
      expect(csvText).toContain('AUR-TEST-ORD-01');
    });

    it('exports inventory report as sanitized CSV', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/inventory?limit=50')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="aureve-inventory-report-.*\.csv"/);

      const csvText = res.text;
      expect(csvText).toContain('SKU');
      expect(csvText).toContain('Inventory Count');
      expect(csvText).toContain('ADM-RING-V1');
      expect(csvText).toContain('ADM-NECK-V1');
    });

    it('exports customers report with formula injection sanitization', async () => {
      // Seed a user whose first name starts with '=' to test formula injection defense
      const maliciousUser = await User.create({
        firstName: '=SUM(1+1)',
        lastName: 'FormulaTest',
        email: 'formulatest@aureve-test.com',
        phone: '9999900099',
        passwordHash: 'dummy_hash',
        role: 'CUSTOMER',
        status: 'ACTIVE'
      });

      try {
        const res = await request(app)
          .get('/api/v1/admin/reports/customers?limit=50')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/csv/);

        const csvText = res.text;
        // Verify the dangerous '=' was escaped with a leading single quote: "'=SUM(1+1)"
        expect(csvText).toContain("'=SUM(1+1)");
      } finally {
        await User.findByIdAndDelete(maliciousUser._id);
      }
    });

    it('rejects unauthenticated requests to CSV report exports with 401', async () => {
      const res = await request(app).get('/api/v1/admin/reports/orders');
      expect(res.status).toBe(401);
    });

    it('rejects staff requests to financial report exports with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/orders')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // 5. AUDIT LOGS QUERYING & FILTERING
  // =========================================================================
  describe('5. Audit Logs Inspection & Filtering by Super Admin', () => {
    it('filters audit logs by action and returns populated performedBy details', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs?action=USER_ROLE_CHANGED')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { auditLogs } = res.body.data;
      expect(auditLogs).toBeInstanceOf(Array);
      expect(auditLogs.length).toBeGreaterThanOrEqual(1);

      const log = auditLogs[0];
      expect(log.action).toBe('USER_ROLE_CHANGED');
      expect(log.performedBy).toBeDefined();
      expect(log.performedBy.firstName).toBe('Vikram');
      expect(log.changes).toBeDefined();
    });

    it('filters audit logs by entity and paginates properly', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs?entity=User&page=1&limit=5')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(5);
    });
  });
});
