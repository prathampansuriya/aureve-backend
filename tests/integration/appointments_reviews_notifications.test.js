import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';
import { User } from '../../src/models/User.js';
import { Category } from '../../src/models/Category.js';
import { Collection } from '../../src/models/Collection.js';
import { Product } from '../../src/models/Product.js';
import { ProductVariant } from '../../src/models/ProductVariant.js';
import { StoreLocation } from '../../src/models/StoreLocation.js';
import { Appointment } from '../../src/models/Appointment.js';
import { Review } from '../../src/models/Review.js';
import { Order } from '../../src/models/Order.js';
import { Notification } from '../../src/models/Notification.js';
import { createPersistentNotification } from '../../src/services/notificationService.js';

describe('AUREVÉ Appointments, Reviews, Store Locations & Notifications Integration Tests', () => {
  let adminUser;
  let staffUser;
  let customerUser;
  let secondCustomer;
  let adminToken;
  let staffToken;
  let customerToken;
  let secondCustomerToken;

  let testCategory;
  let testCollection;
  let testProduct;
  let testVariant;
  let testStore;

  const getFutureDateString = (daysAhead = 7) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  };

  beforeAll(async () => {
    await connectDatabase();

    // Clean up test data for specific test user accounts
    const testEmails = [
      'cs_admin@aureve-test.com',
      'cs_staff@aureve-test.com',
      'cs_cust1@aureve-test.com',
      'cs_cust2@aureve-test.com'
    ];
    const existingUsers = await User.find({ email: { $in: testEmails } });
    const existingUserIds = existingUsers.map((u) => u._id);

    await Appointment.deleteMany({
      $or: [{ userId: { $in: existingUserIds } }, { clientEmail: { $in: testEmails } }]
    });
    await Review.deleteMany({ userId: { $in: existingUserIds } });
    await Notification.deleteMany({ userId: { $in: existingUserIds } });
    await Order.deleteMany({ userId: { $in: existingUserIds } });
    await StoreLocation.deleteMany({ slug: { $in: ['aureve-mumbai-flagship', 'aureve-delhi-boutique'] } });
    await User.deleteMany({ email: { $in: testEmails } });

    // Seed test users
    adminUser = await User.create({
      firstName: 'Aditi',
      lastName: 'Oberoi',
      email: 'cs_admin@aureve-test.com',
      phone: '9820011111',
      passwordHash: 'hashed_password_placeholder',
      role: 'ADMIN',
      status: 'ACTIVE'
    });

    staffUser = await User.create({
      firstName: 'Raghav',
      lastName: 'Sharma',
      email: 'cs_staff@aureve-test.com',
      phone: '9820022222',
      passwordHash: 'hashed_password_placeholder',
      role: 'STAFF',
      status: 'ACTIVE'
    });

    customerUser = await User.create({
      firstName: 'Meera',
      lastName: 'Singhania',
      email: 'cs_cust1@aureve-test.com',
      phone: '9820033333',
      passwordHash: 'hashed_password_placeholder',
      role: 'CUSTOMER',
      status: 'ACTIVE'
    });

    secondCustomer = await User.create({
      firstName: 'Ananya',
      lastName: 'Birla',
      email: 'cs_cust2@aureve-test.com',
      phone: '9820044444',
      passwordHash: 'hashed_password_placeholder',
      role: 'CUSTOMER',
      status: 'ACTIVE'
    });

    // Generate JWT access tokens
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
    secondCustomerToken = jwt.sign(
      { userId: secondCustomer._id.toString(), role: secondCustomer.role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // Seed test category, collection, product and variant
    const mockImage = {
      url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      publicId: 'sample'
    };

    testCategory = await Category.create({
      name: 'High Jewellery Solitaires',
      slug: 'cs-solitaires',
      description: 'Handcrafted diamond solitaires',
      image: mockImage,
      isPublished: true
    });

    testCollection = await Collection.create({
      name: 'Royal Heritage Solitaires',
      slug: 'cs-royal-heritage',
      tagline: 'Imperial Solitaires',
      story: 'Bespoke diamond masterpieces crafted in 24 Karat gold.',
      bannerImage: mockImage,
      thumbnailImage: mockImage,
      isPublished: true
    });

    testProduct = await Product.create({
      title: 'AUREVÉ Celestial Diamond Ring',
      slug: 'cs-celestial-diamond-ring',
      sku: 'AUR-CS-CEL-01',
      description: '24 Karat yellow gold diamond ring with BIS Hallmark certification.',
      categoryId: testCategory._id,
      collectionIds: [testCollection._id],
      status: 'PUBLISHED',
      pricing: {
        baseMetalPricePaise: 3500000,
        makingChargesPaise: 0,
        gstRate: 3
      },
      images: [
        {
          url: mockImage.url,
          publicId: mockImage.publicId,
          alt: 'Celestial Diamond Ring',
          isPrimary: true
        }
      ]
    });

    testVariant = await ProductVariant.create({
      productId: testProduct._id,
      variantName: 'Celestial Ring Size 14',
      sku: 'AUR-CS-CEL-01-YG-14',
      metalType: 'YELLOW_GOLD',
      metalPurity: '18K',
      size: '14',
      grossWeightGrams: 5.0,
      netGoldWeightGrams: 4.5,
      priceInPaise: 3500000,
      inventoryCount: 10,
      isActive: true
    });
  });

  afterAll(async () => {
    const testEmails = [
      'cs_admin@aureve-test.com',
      'cs_staff@aureve-test.com',
      'cs_cust1@aureve-test.com',
      'cs_cust2@aureve-test.com'
    ];
    const existingUsers = await User.find({ email: { $in: testEmails } });
    const existingUserIds = existingUsers.map((u) => u._id);

    await Appointment.deleteMany({
      $or: [{ userId: { $in: existingUserIds } }, { clientEmail: { $in: testEmails } }]
    });
    await Review.deleteMany({ userId: { $in: existingUserIds } });
    await Notification.deleteMany({ userId: { $in: existingUserIds } });
    await Order.deleteMany({ userId: { $in: existingUserIds } });
    await StoreLocation.deleteMany({ slug: { $in: ['aureve-mumbai-flagship', 'aureve-delhi-boutique'] } });
    if (testProduct) await Product.findByIdAndDelete(testProduct._id);
    if (testVariant) await ProductVariant.findByIdAndDelete(testVariant._id);
    if (testCategory) await Category.findByIdAndDelete(testCategory._id);
    if (testCollection) await Collection.findByIdAndDelete(testCollection._id);
    await User.deleteMany({ email: { $in: testEmails } });

    await disconnectDatabase();
  });

  // =========================================================================
  // 1. SHOWROOM STORE LOCATIONS MANAGEMENT
  // =========================================================================
  describe('1. Store Locations Management & Configuration', () => {
    it('should forbid customers from creating a showroom location', async () => {
      const res = await request(app)
        .post('/api/v1/admin/stores')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'AUREVÉ Mumbai Flagship',
          addressLine: 'Altamount Road, Cumballa Hill',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400026',
          phone: '02223510000',
          email: 'mumbai@aureve.com'
        });

      expect(res.status).toBe(403);
    });

    it('should allow admin to create a showroom location with timezone and appointment config', async () => {
      const res = await request(app)
        .post('/api/v1/admin/stores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'AUREVÉ Mumbai Flagship',
          slug: 'aureve-mumbai-flagship',
          addressLine: 'Altamount Road, Cumballa Hill',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400026',
          phone: '02223510000',
          email: 'mumbai@aureve.com',
          timezone: 'Asia/Kolkata',
          openingHours: {
            weekdays: '10:00 AM – 8:00 PM',
            weekends: '11:00 AM – 9:00 PM'
          },
          appointmentConfig: {
            slotDurationMinutes: 60,
            capacityPerSlot: 2,
            openingHour: 10,
            closingHour: 20,
            leadTimeHours: 2,
            cancellationLeadTimeHours: 4,
            virtualEnabled: true,
            inStoreEnabled: true
          },
          vipLoungeAvailable: true,
          isActive: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.store.name).toBe('AUREVÉ Mumbai Flagship');
      expect(res.body.data.store.timezone).toBe('Asia/Kolkata');
      expect(res.body.data.store.appointmentConfig.capacityPerSlot).toBe(2);

      testStore = res.body.data.store;
    });

    it('should reject creating duplicate showroom with same name or slug', async () => {
      const res = await request(app)
        .post('/api/v1/admin/stores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'AUREVÉ Mumbai Flagship',
          addressLine: 'Another address',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400026',
          phone: '02223510000',
          email: 'mumbai2@aureve.com'
        });

      expect(res.status).toBe(409);
    });

    it('should retrieve active showrooms publicly with city filter', async () => {
      const res = await request(app).get('/api/v1/stores?city=Mumbai');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.stores)).toBe(true);
      expect(res.body.data.stores.some((s) => s.slug === 'aureve-mumbai-flagship')).toBe(true);
    });

    it('should retrieve single showroom by slug or ID', async () => {
      const resBySlug = await request(app).get('/api/v1/stores/aureve-mumbai-flagship');
      expect(resBySlug.status).toBe(200);
      expect(resBySlug.body.data.store._id).toBe(testStore._id);

      const resById = await request(app).get(`/api/v1/stores/${testStore._id}`);
      expect(resById.status).toBe(200);
      expect(resById.body.data.store.slug).toBe('aureve-mumbai-flagship');
    });

    it('should allow admin to update showroom opening hours and configuration', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          openingHours: {
            weekdays: '10:00 AM – 8:30 PM',
            weekends: '10:30 AM – 9:00 PM'
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.data.store.openingHours.weekdays).toBe('10:00 AM – 8:30 PM');
    });
  });

  // =========================================================================
  // 2. APPOINTMENT AVAILABILITY & TIMEZONE STRATEGY
  // =========================================================================
  describe('2. Appointment Slot Availability & Timezone Handling', () => {
    it('should reject availability queries for dates in the past', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/availability?date=2020-01-01&storeLocationId=${testStore._id}`);

      expect(res.status).toBe(400);
    });

    it('should calculate slot availability for in-store VIP consultations with store timezone', async () => {
      const targetDate = getFutureDateString(5);
      const res = await request(app)
        .get(`/api/v1/appointments/availability?date=${targetDate}&storeLocationId=${testStore._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timezone).toBe('Asia/Kolkata');
      expect(res.body.data.storeLocation.name).toBe('AUREVÉ Mumbai Flagship');
      expect(Array.isArray(res.body.data.slots)).toBe(true);
      expect(res.body.data.slots.length).toBeGreaterThan(0);

      const firstSlot = res.body.data.slots[0];
      expect(firstSlot).toHaveProperty('timeSlot');
      expect(firstSlot.capacity).toBe(2);
      expect(firstSlot.available).toBe(true);
      expect(firstSlot.bookedCount).toBe(0);
    });

    it('should return availability for virtual consultation format', async () => {
      const targetDate = getFutureDateString(5);
      const res = await request(app)
        .get(`/api/v1/appointments/availability?date=${targetDate}&appointmentType=VIRTUAL_CONSULTATION`);

      expect(res.status).toBe(200);
      expect(res.body.data.appointmentType).toBe('VIRTUAL_CONSULTATION');
      expect(res.body.data.slots[0].capacity).toBe(3); // Virtual default capacity: 3
    });
  });

  // =========================================================================
  // 3. APPOINTMENT BOOKING & DOUBLE-BOOKING PREVENTION
  // =========================================================================
  describe('3. VIP Appointment Booking & Concurrency Safeguards', () => {
    let bookedAppointment;
    const bookingDate = getFutureDateString(8);
    const targetSlot = '11:00 AM - 12:00 PM';

    it('should book an in-store VIP appointment with customer and showroom details', async () => {
      const res = await request(app)
        .post('/api/v1/appointments/book')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          clientName: 'Meera Singhania',
          clientEmail: 'cs_cust1@aureve-test.com',
          clientPhone: '9820033333',
          appointmentType: 'IN_STORE_VIP',
          storeLocationId: testStore._id,
          scheduledDate: bookingDate,
          timeSlot: targetSlot,
          interestCategories: ['High Jewellery Solitaires', 'Bridal Sets'],
          notes: 'Interested in bespoke emerald-cut diamond ring preview.',
          idempotencyKey: 'IDEMP-APP-BOOK-001'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appointment.status).toBe('CONFIRMED');
      expect(res.body.data.appointment.clientName).toBe('Meera Singhania');
      expect(res.body.data.appointment.userId).toBe(customerUser._id.toString());

      bookedAppointment = res.body.data.appointment;
    });

    it('should return existing appointment when same idempotency key is submitted', async () => {
      const res = await request(app)
        .post('/api/v1/appointments/book')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          clientName: 'Meera Singhania',
          clientEmail: 'cs_cust1@aureve-test.com',
          clientPhone: '9820033333',
          appointmentType: 'IN_STORE_VIP',
          storeLocationId: testStore._id,
          scheduledDate: bookingDate,
          timeSlot: targetSlot,
          idempotencyKey: 'IDEMP-APP-BOOK-001'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.appointment._id).toBe(bookedAppointment._id);
    });

    it('should book a virtual consultation with auto-generated secure meeting link', async () => {
      const res = await request(app)
        .post('/api/v1/appointments/book')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          clientName: 'Meera Singhania',
          clientEmail: 'cs_cust1@aureve-test.com',
          clientPhone: '9820033333',
          appointmentType: 'VIRTUAL_CONSULTATION',
          scheduledDate: bookingDate,
          timeSlot: '02:00 PM - 03:00 PM',
          notes: 'Virtual bridal styling for upcoming sangeet.'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.appointment.appointmentType).toBe('VIRTUAL_CONSULTATION');
      expect(res.body.data.appointment.meetingLink).toMatch(/^https:\/\/meet\.aureve\.com\/consultation-/);
    });

    it('should prevent double-booking when slot capacity is exhausted under concurrent requests', async () => {
      // The slot capacity is 2. Booking 1 is already made by Meera.
      // Second booking by Ananya Birla fills the slot to capacity (2/2):
      const secondBookingRes = await request(app)
        .post('/api/v1/appointments/book')
        .set('Authorization', `Bearer ${secondCustomerToken}`)
        .send({
          clientName: 'Ananya Birla',
          clientEmail: 'cs_cust2@aureve-test.com',
          clientPhone: '9820044444',
          appointmentType: 'IN_STORE_VIP',
          storeLocationId: testStore._id,
          scheduledDate: bookingDate,
          timeSlot: targetSlot,
          notes: 'Second VIP reservation for same slot.'
        });

      expect(secondBookingRes.status).toBe(201);

      // Verify availability now marks the slot as full (bookedCount = 2, available = false):
      const availRes = await request(app)
        .get(`/api/v1/appointments/availability?date=${bookingDate}&storeLocationId=${testStore._id}`);
      const slotInfo = availRes.body.data.slots.find((s) => s.timeSlot === targetSlot);
      expect(slotInfo.bookedCount).toBe(2);
      expect(slotInfo.available).toBe(false);
      expect(slotInfo.reason).toBe('SLOT_FULL');

      // Third booking attempt for the full slot must be rejected with 409 Conflict:
      const thirdBookingRes = await request(app)
        .post('/api/v1/appointments/book')
        .send({
          clientName: 'Pooja Kapoor',
          clientEmail: 'pooja@aureve-guest.com',
          clientPhone: '9820099999',
          appointmentType: 'IN_STORE_VIP',
          storeLocationId: testStore._id,
          scheduledDate: bookingDate,
          timeSlot: targetSlot
        });

      expect(thirdBookingRes.status).toBe(409);
      expect(thirdBookingRes.body.success).toBe(false);
    });

    it('should block showroom deletion when active/upcoming customer appointments exist', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Cannot delete showroom.*active or upcoming/);
    });
  });

  // =========================================================================
  // 4. ADMINISTRATIVE SLOT BLOCKING
  // =========================================================================
  describe('4. Administrative Slot Blocking', () => {
    const blockDate = getFutureDateString(10);
    const blockSlot = '03:00 PM - 04:00 PM';

    it('should allow admin/concierge to block a slot for private boutique events', async () => {
      const res = await request(app)
        .post('/api/v1/admin/appointments/block-slot')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          storeLocationId: testStore._id,
          appointmentType: 'IN_STORE_VIP',
          scheduledDate: blockDate,
          timeSlot: blockSlot,
          notes: 'Private Royal Heritage High Jewellery Exhibition.'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.blocked.status).toBe('BLOCKED');
    });

    it('should reflect the blocked slot as booked in public availability', async () => {
      const res = await request(app)
        .get(`/api/v1/appointments/availability?date=${blockDate}&storeLocationId=${testStore._id}`);

      const slot = res.body.data.slots.find((s) => s.timeSlot === blockSlot);
      expect(slot.bookedCount).toBe(1);
    });
  });

  // =========================================================================
  // 5. RESCHEDULING & CANCELLATION POLICIES
  // =========================================================================
  describe('5. Appointment Rescheduling & Cancellation Policies', () => {
    let appointmentToModify;
    const appointmentDate = getFutureDateString(12);

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/appointments/book')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          clientName: 'Meera Singhania',
          clientEmail: 'cs_cust1@aureve-test.com',
          clientPhone: '9820033333',
          appointmentType: 'IN_STORE_VIP',
          storeLocationId: testStore._id,
          scheduledDate: appointmentDate,
          timeSlot: '04:00 PM - 05:00 PM',
          notes: 'Initial booking for modification test.'
        });

      appointmentToModify = res.body.data.appointment;
    });

    it('should forbid other customers from cancelling an appointment they do not own', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${appointmentToModify._id}/cancel`)
        .set('Authorization', `Bearer ${secondCustomerToken}`)
        .send({ reason: 'Malicious cancellation attempt.' });

      expect(res.status).toBe(403);
    });

    it('should allow owner customer to reschedule appointment to another available slot', async () => {
      const newDate = getFutureDateString(14);
      const res = await request(app)
        .patch(`/api/v1/appointments/${appointmentToModify._id}/reschedule`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          scheduledDate: newDate,
          timeSlot: '05:00 PM - 06:00 PM',
          notes: 'Traveling on original date, moving to next week.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.status).toBe('RESCHEDULED');
      expect(res.body.data.appointment.timeSlot).toBe('05:00 PM - 06:00 PM');
    });

    it('should allow customer to cancel their appointment with a valid reason', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${appointmentToModify._id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Schedule conflict with family function.' });

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.status).toBe('CANCELLED');
      expect(res.body.data.appointment.cancellationReason).toBe('Schedule conflict with family function.');
    });

    it('should reject cancelling an appointment that is already cancelled', async () => {
      const res = await request(app)
        .patch(`/api/v1/appointments/${appointmentToModify._id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Attempting duplicate cancellation.' });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 6. ADMINISTRATIVE APPOINTMENT QUEUE & CONCIERGE ASSIGNMENT
  // =========================================================================
  describe('6. Administrative Appointment Queue & Concierge Moderation', () => {
    let adminManagedAppointment;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/appointments/book')
        .send({
          clientName: 'Varun Dhawan',
          clientEmail: 'varun@aureve-test.com',
          clientPhone: '9820055555',
          appointmentType: 'VIRTUAL_CONSULTATION',
          scheduledDate: getFutureDateString(6),
          timeSlot: '06:00 PM - 07:00 PM'
        });

      adminManagedAppointment = res.body.data.appointment;
    });

    it('should allow staff/admin to view master appointment calendar with filters', async () => {
      const res = await request(app)
        .get('/api/v1/admin/appointments?appointmentType=VIRTUAL_CONSULTATION')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.appointments)).toBe(true);
    });

    it('should allow staff/admin to assign concierge staff, update status, and update meeting link', async () => {
      const customMeetingLink = 'https://meet.google.com/aur-concierge-vip';
      const res = await request(app)
        .patch(`/api/v1/admin/appointments/${adminManagedAppointment._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignedStaffId: staffUser._id,
          status: 'COMPLETED',
          meetingLink: customMeetingLink,
          notes: 'Consultation conducted by senior concierge Raghav Sharma.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.status).toBe('COMPLETED');
      expect(res.body.data.appointment.meetingLink).toBe(customMeetingLink);
      expect(res.body.data.appointment.assignedStaffId).toBe(staffUser._id.toString());
    });

    it('should reject invalid appointment status transition (e.g. COMPLETED -> CONFIRMED)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/appointments/${adminManagedAppointment._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 7. CUSTOMER REVIEWS, VERIFIED PURCHASE & MODERATION
  // =========================================================================
  describe('7. Customer Reviews, Verified Purchases & Rating Aggregates', () => {
    let createdReview;

    it('should submit an authenticated review with verifiedPurchase = false if customer has no delivered order', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${secondCustomerToken}`)
        .send({
          productId: testProduct._id,
          rating: 4,
          title: 'Exquisite design, waiting for my order',
          comment: 'Saw this solitaire in the boutique catalogue. Stunning craftsmanship and finish.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.review.status).toBe('PENDING');
      expect(res.body.data.review.isVerifiedPurchase).toBe(false);
      expect(res.body.data.review.orderId).toBeNull();
    });

    it('should mark review as isVerifiedPurchase = true when customer has a real DELIVERED order', async () => {
      // Seed a real DELIVERED order for customerUser
      const deliveredOrder = await Order.create({
        orderNumber: 'AUR-DELIV-REV-001',
        userId: customerUser._id,
        items: [
          {
            productId: testProduct._id,
            variantId: testVariant._id,
            title: testProduct.title,
            sku: testVariant.sku,
            unitPricePaise: testVariant.priceInPaise,
            totalPaise: testVariant.priceInPaise,
            quantity: 1
          }
        ],
        shippingAddress: {
          fullName: 'Meera Singhania',
          addressLine: 'Altamount Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400026',
          phone: '9820033333'
        },
        billingAddress: {
          fullName: 'Meera Singhania',
          addressLine: 'Altamount Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400026',
          phone: '9820033333'
        },
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'PAID',
        orderStatus: 'DELIVERED',
        financialBreakdown: {
          subtotalPaise: 3500000,
          grandTotalPaise: 3500000
        }
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct._id,
          rating: 5,
          title: 'Absolute Masterpiece of Haute Joaillerie',
          comment: 'The fire and brilliance of this solitaire diamond is unparalleled. Pristine BIS hallmarking and luxury packaging.'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.review.isVerifiedPurchase).toBe(true);
      expect(res.body.data.review.orderId).toBe(deliveredOrder._id.toString());
      expect(res.body.data.review.status).toBe('PENDING');

      createdReview = res.body.data.review;
    });

    it('should enforce duplicate-review policy by rejecting second review for the same product', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct._id,
          rating: 5,
          title: 'Another review attempt',
          comment: 'Attempting duplicate review for the same jewellery piece.'
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already submitted a review/i);
    });

    it('should NOT display PENDING reviews on the public product reviews endpoint', async () => {
      const res = await request(app).get(`/api/v1/reviews/product/${testProduct._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalReviews).toBe(0);
      expect(res.body.data.reviews.length).toBe(0);
    });

    it('should allow admin/staff to view review moderation queue', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reviews?status=PENDING')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.reviews.some((r) => r._id === createdReview._id)).toBe(true);
    });

    it('should approve review and dynamically update Product averageRating and reviewCount', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/reviews/${createdReview._id}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'APPROVED',
          moderatorNotes: 'Verified luxury buyer review with authentic testimonial.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.review.status).toBe('APPROVED');
      expect(res.body.data.productAggregates.averageRating).toBe(5);
      expect(res.body.data.productAggregates.reviewCount).toBe(1);

      // Verify Product document in database reflects rating updates
      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct.averageRating).toBe(5);
      expect(updatedProduct.reviewCount).toBe(1);
    });

    it('should now display approved reviews with rating breakdown on public product endpoint', async () => {
      const res = await request(app).get(`/api/v1/reviews/product/${testProduct._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.averageRating).toBe(5);
      expect(res.body.data.summary.totalReviews).toBe(1);
      expect(res.body.data.summary.starBreakdown.star5.count).toBe(1);
      expect(res.body.data.summary.starBreakdown.star5.percentage).toBe(100);
      expect(res.body.data.reviews.length).toBe(1);
      expect(res.body.data.reviews[0].title).toBe('Absolute Masterpiece of Haute Joaillerie');
      expect(res.body.data.reviews[0].isVerifiedPurchase).toBe(true);
    });

    it('should record helpful votes on approved review and reject self-voting', async () => {
      // Self vote rejection
      const selfVoteRes = await request(app)
        .patch(`/api/v1/reviews/${createdReview._id}/vote`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(selfVoteRes.status).toBe(400);

      // Another user votes helpful
      const validVoteRes = await request(app)
        .patch(`/api/v1/reviews/${createdReview._id}/vote`)
        .set('Authorization', `Bearer ${secondCustomerToken}`);

      expect(validVoteRes.status).toBe(200);
      expect(validVoteRes.body.data.helpfulVotes).toBe(1);
    });
  });

  // =========================================================================
  // 8. NOTIFICATIONS CENTER & IDEMPOTENT DELIVERY
  // =========================================================================
  describe('8. Customer Notifications Center & Idempotent Event Handling', () => {
    it('should retrieve customer persistent notifications and unread badge count', async () => {
      const listRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data.notifications)).toBe(true);

      const countRes = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(countRes.status).toBe(200);
      expect(countRes.body.data.unreadCount).toBeGreaterThan(0);
    });

    it('should mark a single notification as read', async () => {
      const notif = await Notification.findOne({ userId: customerUser._id, isRead: false });
      expect(notif).toBeDefined();

      const res = await request(app)
        .patch(`/api/v1/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notification.isRead).toBe(true);
    });

    it('should mark all customer notifications as read', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);

      const countRes = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(countRes.body.data.unreadCount).toBe(0);
    });

    it('should suppress duplicate notification and email when identical idempotency key is triggered', async () => {
      const key = 'IDEMP-NOTIF-TEST-100';

      const firstCall = await createPersistentNotification({
        userId: customerUser._id,
        title: 'VIP Salon Invitation',
        message: 'You are cordially invited to our exclusive preview.',
        type: 'PROMOTION',
        idempotencyKey: key,
        sendEmail: true
      });

      const secondCall = await createPersistentNotification({
        userId: customerUser._id,
        title: 'VIP Salon Invitation',
        message: 'You are cordially invited to our exclusive preview.',
        type: 'PROMOTION',
        idempotencyKey: key,
        sendEmail: true
      });

      expect(secondCall._id.toString()).toBe(firstCall._id.toString());

      // Verify only 1 notification exists with that key
      const count = await Notification.countDocuments({ userId: customerUser._id, idempotencyKey: key });
      expect(count).toBe(1);
    });
  });
});
