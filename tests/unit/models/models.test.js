import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../../../src/config/db.js';
import {
  User,
  EmailOtp,
  Session,
  PasswordResetToken,
  AuditLog,
  Category,
  Collection,
  Product,
  ProductVariant,
  Banner,
  HomepageSection,
  Wishlist,
  Cart,
  Coupon,
  Offer,
  Address,
  Order,
  Payment,
  InventoryLog,
  Review,
  Appointment,
  StoreLocation,
  Notification,
  NotificationPreference
} from '../../../src/models/index.js';
import { runInTransaction, isReplicaSetSupported } from '../../../src/utils/transactionHelper.js';

describe('Complete Mongoose Database Model Integrity & Invariants', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('Model Registration', () => {
    it('should successfully register all 22 required domain models with Mongoose', () => {
      const registeredModels = Object.keys(mongoose.models);
      const expectedModels = [
        'User',
        'EmailOtp',
        'Session',
        'PasswordResetToken',
        'AuditLog',
        'Category',
        'Collection',
        'Product',
        'ProductVariant',
        'Banner',
        'HomepageSection',
        'Wishlist',
        'Cart',
        'Coupon',
        'Offer',
        'Address',
        'Order',
        'Payment',
        'InventoryLog',
        'Review',
        'Appointment',
        'StoreLocation',
        'Notification',
        'NotificationPreference'
      ];

      expectedModels.forEach((modelName) => {
        expect(registeredModels).toContain(modelName);
      });
    });
  });

  describe('User Model Validations & Invariants', () => {
    it('should validate required fields and reject invalid emails and phone numbers', () => {
      const user = new User({
        firstName: '',
        lastName: '',
        email: 'invalid-email',
        phone: '123'
      });

      const err = user.validateSync();
      expect(err.errors.firstName).toBeDefined();
      expect(err.errors.lastName).toBeDefined();
      expect(err.errors.email).toBeDefined();
      expect(err.errors.phone).toBeDefined();
    });

    it('should compute the fullName virtual property correctly', () => {
      const user = new User({
        firstName: 'Ananya',
        lastName: 'Singhania',
        email: 'ananya@aureve.com',
        passwordHash: 'dummy_hash_123456789'
      });

      expect(user.fullName).toBe('Ananya Singhania');
      expect(user.role).toBe('CUSTOMER');
      expect(user.status).toBe('ACTIVE');
      expect(user.isVerified).toBe(false);
      expect(user.isLocked()).toBe(false);
    });

    it('should recognize when an account is locked via lockUntil', () => {
      const user = new User({
        firstName: 'Dev',
        lastName: 'Admin',
        email: 'admin@aureve.com',
        passwordHash: 'dummy_hash_123456789',
        lockUntil: new Date(Date.now() + 15 * 60 * 1000)
      });

      expect(user.isLocked()).toBe(true);
    });
  });

  describe('Product and ProductVariant Minor Unit (Paise) Validations', () => {
    it('should reject non-integer paise or floating point currency values', () => {
      const variant = new ProductVariant({
        productId: new mongoose.Types.ObjectId(),
        variantName: '18K Yellow Gold / Size 12',
        sku: 'AUR-TST-001',
        metalType: 'YELLOW_GOLD',
        metalPurity: '18K',
        size: '12',
        grossWeightGrams: 5.4,
        netGoldWeightGrams: 5.1,
        priceInPaise: 125000.5 // Non-integer paise floating point
      });

      const err = variant.validateSync();
      expect(err.errors.priceInPaise).toBeDefined();
    });

    it('should validate valid ProductVariant with integer paise and compute availableStock virtual', () => {
      const variant = new ProductVariant({
        productId: new mongoose.Types.ObjectId(),
        variantName: '18K Yellow Gold / Size 12',
        sku: 'AUR-TST-002',
        metalType: 'YELLOW_GOLD',
        metalPurity: '18K',
        size: '12',
        grossWeightGrams: 5.4,
        netGoldWeightGrams: 5.1,
        priceInPaise: 12500000, // ₹1,25,000 in integer paise
        inventoryCount: 10,
        reservedCount: 3
      });

      const err = variant.validateSync();
      expect(err).toBeUndefined();
      expect(variant.availableStock).toBe(7);
    });

    it('should require at least one showcase image for a Product', () => {
      const product = new Product({
        title: 'The Regal Polki Choker',
        slug: 'regal-polki-choker',
        sku: 'AUR-NK-001',
        description: 'Heritage royal craftsmanship',
        categoryId: new mongoose.Types.ObjectId(),
        pricing: {
          baseMetalPricePaise: 25000000
        },
        images: []
      });

      const err = product.validateSync();
      expect(err.errors.images).toBeDefined();
    });
  });

  describe('Cart & Order Financial Integrity', () => {
    it('should reject non-integer paise values in Order financial breakdown', () => {
      const order = new Order({
        orderNumber: 'AUR-20261017-0001',
        userId: new mongoose.Types.ObjectId(),
        items: [],
        shippingAddress: {},
        billingAddress: {},
        paymentMethod: 'RAZORPAY',
        financialBreakdown: {
          subtotalPaise: 1000.75, // Invalid float
          grandTotalPaise: 1030.77
        }
      });

      const err = order.validateSync();
      expect(err.errors['financialBreakdown.subtotalPaise']).toBeDefined();
    });

    it('should reject cart items with quantity exceeding max limit of 5 units', () => {
      const cart = new Cart({
        items: [
          {
            productId: new mongoose.Types.ObjectId(),
            variantId: new mongoose.Types.ObjectId(),
            quantity: 10, // Exceeds luxury limit of 5
            priceInPaise: 5000000
          }
        ]
      });

      const err = cart.validateSync();
      expect(err.errors['items.0.quantity']).toBeDefined();
    });
  });

  describe('Coupon Rules & Validity Invariants', () => {
    it('should correctly evaluate coupon validity with isValidNow()', () => {
      const validCoupon = new Coupon({
        code: 'ROYAL10',
        description: '10% off for inaugural season',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValuePaise: 5000000,
        validFrom: new Date(Date.now() - 3600000),
        validUntil: new Date(Date.now() + 86400000),
        isActive: true
      });

      expect(validCoupon.isValidNow()).toBe(true);

      const expiredCoupon = new Coupon({
        code: 'EXPIRED10',
        description: 'Expired promo',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        validFrom: new Date(Date.now() - 7200000),
        validUntil: new Date(Date.now() - 3600000),
        isActive: true
      });

      expect(expiredCoupon.isValidNow()).toBe(false);
    });
  });

  describe('Transaction Safety Helper', () => {
    it('should safely execute runInTransaction without throwing topology errors', async () => {
      let executed = false;
      const result = await runInTransaction(async (_session) => {
        executed = true;
        return 'success';
      });

      expect(executed).toBe(true);
      expect(result).toBe('success');
      expect(typeof isReplicaSetSupported()).toBe('boolean');
    });
  });
});
