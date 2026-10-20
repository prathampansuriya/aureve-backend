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
import { Cart } from '../../src/models/Cart.js';
import { Wishlist } from '../../src/models/Wishlist.js';
import { Coupon } from '../../src/models/Coupon.js';
import { Offer } from '../../src/models/Offer.js';

describe('AUREVÉ Wishlist, Cart, Coupons, Offers & Authoritative Pricing Tests', () => {
  let adminUser;
  let customerUser;
  let secondCustomer;
  let adminToken;
  let customerToken;
  let secondCustomerToken;

  let testCategory;
  let testCollection;
  let testProduct;
  let testVariant;
  let secondVariant;

  const mockImage = {
    url: 'https://res.cloudinary.com/aureve/image/upload/v1/catalog/ring.jpg',
    publicId: 'catalog/ring_id',
    alt: 'AUREVÉ Diamond Solitaire Ring'
  };

  beforeAll(async () => {
    await connectDatabase();

    // Clean up test data for specific commerce test accounts
    const existingUsers = await User.find({
      email: { $in: ['comm_admin@aureve-test.com', 'comm_cust1@aureve-test.com', 'comm_cust2@aureve-test.com'] }
    });
    const existingUserIds = existingUsers.map(u => u._id);
    await Cart.deleteMany({ userId: { $in: existingUserIds } });
    await Wishlist.deleteMany({ userId: { $in: existingUserIds } });
    await User.deleteMany({ _id: { $in: existingUserIds } });
    await Category.deleteMany({ slug: { $regex: /^comm-test-/ } });
    await Collection.deleteMany({ slug: { $regex: /^comm-test-/ } });
    await Product.deleteMany({ sku: { $regex: /^COMM-TEST-/ } });
    await ProductVariant.deleteMany({ sku: { $regex: /^COMM-VAR-/ } });
    await Coupon.deleteMany({ code: { $regex: /^TEST/ } });
    await Offer.deleteMany({ slug: { $regex: /^comm-test-/ } });

    // Seed test users
    adminUser = await User.create({
      firstName: 'Devavrata',
      lastName: 'Singhania',
      email: 'comm_admin@aureve-test.com',
      passwordHash: 'hashed_admin_pass',
      role: 'ADMIN',
      status: 'ACTIVE',
      isVerified: true
    });

    customerUser = await User.create({
      firstName: 'Meera',
      lastName: 'Kapoor',
      email: 'comm_cust1@aureve-test.com',
      passwordHash: 'hashed_cust_pass',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      isVerified: true
    });

    secondCustomer = await User.create({
      firstName: 'Kabir',
      lastName: 'Mehta',
      email: 'comm_cust2@aureve-test.com',
      passwordHash: 'hashed_cust2_pass',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      isVerified: true
    });

    adminToken = jwt.sign(
      { userId: adminUser._id.toString(), role: 'ADMIN' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    customerToken = jwt.sign(
      { userId: customerUser._id.toString(), role: 'CUSTOMER' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    secondCustomerToken = jwt.sign(
      { userId: secondCustomer._id.toString(), role: 'CUSTOMER' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // Create Category & Collection
    testCategory = await Category.create({
      name: 'Commerce Solitaire Rings',
      slug: 'comm-test-solitaire-rings',
      description: 'Diamond solitaire rings',
      image: mockImage,
      isActive: true
    });

    testCollection = await Collection.create({
      name: 'Commerce Royal Solitaire',
      slug: 'comm-test-royal-solitaire',
      tagline: 'Imperial Diamond Solitaires',
      story: 'Handcrafted diamond rings of immaculate cut and clarity.',
      bannerImage: mockImage,
      thumbnailImage: mockImage,
      status: 'ACTIVE'
    });

    // Create Product
    testProduct = await Product.create({
      title: 'The Empress Diamond Solitaire Ring',
      slug: 'comm-test-empress-diamond-ring',
      sku: 'COMM-TEST-PROD-01',
      description: 'A breathtaking 2-carat diamond solitaire set in 18K white gold.',
      categoryId: testCategory._id,
      collectionIds: [testCollection._id],
      pricing: {
        baseMetalPricePaise: 8000000, // ₹80,000
        makingChargesPaise: 1500000, // ₹15,000
        gstRate: 3
      },
      images: [
        {
          url: mockImage.url,
          publicId: mockImage.publicId,
          alt: 'Empress Solitaire Ring',
          isPrimary: true
        }
      ],
      status: 'PUBLISHED'
    });

    // Create primary Variant with 5 units in stock
    testVariant = await ProductVariant.create({
      productId: testProduct._id,
      variantName: 'Size 14 / 18K White Gold',
      sku: 'COMM-VAR-EMPRESS-14WG',
      metalType: 'WHITE_GOLD',
      metalPurity: '18K',
      size: '14_HK',
      grossWeightGrams: 6.5,
      netGoldWeightGrams: 5.2,
      diamondWeightCarat: 2.05,
      priceInPaise: 35000000, // ₹3,50,000
      inventoryCount: 5,
      reservedCount: 0,
      availability: 'AVAILABLE',
      isActive: true
    });

    // Create secondary Variant with limited stock of 2 units
    secondVariant = await ProductVariant.create({
      productId: testProduct._id,
      variantName: 'Size 16 / 18K Rose Gold',
      sku: 'COMM-VAR-EMPRESS-16RG',
      metalType: 'ROSE_GOLD',
      metalPurity: '18K',
      size: '16_HK',
      grossWeightGrams: 6.8,
      netGoldWeightGrams: 5.4,
      diamondWeightCarat: 2.1,
      priceInPaise: 36000000, // ₹3,60,000
      inventoryCount: 2,
      reservedCount: 0,
      availability: 'AVAILABLE',
      isActive: true
    });
  });

  afterAll(async () => {
    const userIds = [adminUser?._id, customerUser?._id, secondCustomer?._id].filter(Boolean);
    await Cart.deleteMany({ userId: { $in: userIds } });
    await Wishlist.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    await Category.deleteMany({ slug: { $regex: /^comm-test-/ } });
    await Collection.deleteMany({ slug: { $regex: /^comm-test-/ } });
    await Product.deleteMany({ sku: { $regex: /^COMM-TEST-/ } });
    await ProductVariant.deleteMany({ sku: { $regex: /^COMM-VAR-/ } });
    await Coupon.deleteMany({ code: { $regex: /^TEST/ } });
    await Offer.deleteMany({ slug: { $regex: /^comm-test-/ } });
    await disconnectDatabase();
  });

  // ==========================================
  // 1. WISHLIST MANAGEMENT
  // ==========================================
  describe('1. Wishlist Operations', () => {
    it('should add an item to customer wishlist and prevent duplicates', async () => {
      // First addition
      const res1 = await request(app)
        .post('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct._id,
          variantId: testVariant._id
        });

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.count).toBe(1);

      // Duplicate addition
      const res2 = await request(app)
        .post('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct._id,
          variantId: testVariant._id
        });

      expect(res2.status).toBe(201);
      // Count remains 1 (idempotent duplicate prevention)
      expect(res2.body.data.count).toBe(1);
    });

    it('should view wishlist with live product availability and price in paise', async () => {
      const res = await request(app)
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);

      const item = res.body.data.items[0];
      expect(item.title).toBe(testProduct.title);
      expect(item.sku).toBe(testVariant.sku);
      expect(item.priceInPaise).toBe(35000000);
      expect(item.isAvailable).toBe(true);
      expect(item.availableStock).toBe(5);
    });

    it('should move item from wishlist to cart', async () => {
      const res = await request(app)
        .post('/api/v1/wishlist/move-to-cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct._id,
          variantId: testVariant._id,
          quantity: 1
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify wishlist is now empty
      const wishRes = await request(app)
        .get('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(wishRes.body.data.items).toHaveLength(0);

      // Verify cart has the item
      const cartRes = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(cartRes.body.data.items).toHaveLength(1);
      expect(cartRes.body.data.items[0].sku).toBe(testVariant.sku);
    });

    it('should remove an item from wishlist', async () => {
      // Add secondary item
      await request(app)
        .post('/api/v1/wishlist')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProduct._id,
          variantId: secondVariant._id
        });

      const delRes = await request(app)
        .delete(`/api/v1/wishlist/${testProduct._id}?variantId=${secondVariant._id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.items).toHaveLength(0);
    });
  });

  // ==========================================
  // 2. CART MANAGEMENT & QUANTITY INVARIANTS
  // ==========================================
  describe('2. Cart Operations & Quantity Limits', () => {
    it('should clear customer cart', async () => {
      const res = await request(app)
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
      expect(res.body.data.pricing.subtotalPaise).toBe(0);
    });

    it('should add variant to cart with live price calculation in integer paise', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          variantId: testVariant._id,
          quantity: 2
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);

      const item = res.body.data.items[0];
      expect(item.quantity).toBe(2);
      expect(item.unitPricePaise).toBe(35000000);
      expect(item.lineTotalPaise).toBe(70000000); // 2 * 3,50,000 = 7,00,000 INR

      // 3% GST calculation check: 70000000 * 0.03 = 2100000 paise
      expect(res.body.data.pricing.subtotalPaise).toBe(70000000);
      expect(res.body.data.pricing.gstPaise).toBe(2100000);
      // Insured shipping is free (>= ₹50,000)
      expect(res.body.data.pricing.shippingFeePaise).toBe(0);
      expect(res.body.data.pricing.grandTotalPaise).toBe(72100000);
    });

    it('should merge duplicate variant additions into single line item', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          variantId: testVariant._id,
          quantity: 1
        });

      expect(res.status).toBe(201);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].quantity).toBe(3); // 2 + 1 = 3
    });

    it('should reject quantity exceeding maximum limit of 5 units', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          variantId: testVariant._id,
          quantity: 3 // Current 3 + 3 = 6 > 5
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Maximum of 5 units allowed');
    });

    it('should block adding or updating quantity beyond available unreserved stock (stock exhaustion)', async () => {
      // secondVariant has inventoryCount: 2
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          variantId: secondVariant._id,
          quantity: 4 // Exceeds available 2
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Insufficient inventory');
    });

    it('should update line item quantity within permitted bounds', async () => {
      const res = await request(app)
        .put(`/api/v1/cart/items/${testVariant._id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].quantity).toBe(1);
      expect(res.body.data.pricing.subtotalPaise).toBe(35000000);
    });

    it('should remove line item from cart', async () => {
      const res = await request(app)
        .delete(`/api/v1/cart/items/${testVariant._id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
    });
  });

  // ==========================================
  // 3. GUEST CART & MERGE FLOW
  // ==========================================
  describe('3. Guest Cart & Login Migration', () => {
    const guestToken = 'guest_session_token_xyz_998877';

    it('should add items to an unauthenticated guest cart via x-guest-token header', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('x-guest-token', guestToken)
        .send({
          variantId: secondVariant._id,
          quantity: 1
        });

      expect(res.status).toBe(201);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.guestToken).toBe(guestToken);
    });

    it('should merge guest cart into customer account upon login and purge guest cart', async () => {
      const res = await request(app)
        .post('/api/v1/cart/merge')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ guestToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.some((i) => i.sku === secondVariant.sku)).toBe(true);

      // Verify guest cart was purged
      const guestCheck = await Cart.findOne({ guestToken });
      expect(guestCheck).toBeNull();
    });
  });

  // ==========================================
  // 4. COUPON ENGINE & REDEMPTION RULES
  // ==========================================
  describe('4. Coupons Management, Expiry, Min-Purchase & Usage Limits', () => {
    let percentageCoupon;
    let flatCoupon;
    let expiredCoupon;
    let minPurchaseCoupon;

    beforeAll(async () => {
      // 1. Percentage Coupon: 10% off with max ₹20,000 cap (2000000 paise)
      percentageCoupon = await Coupon.create({
        code: 'TESTROYAL10',
        description: '10% Royal Heritage Privilege',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        maxDiscountLimitPaise: 2000000, // ₹20,000 cap
        minOrderValuePaise: 10000000, // ₹1,00,000 min order
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000 * 30),
        usageLimitPerUser: 1,
        isActive: true
      });

      // 2. Flat Coupon: ₹25,000 flat discount (2500000 paise)
      flatCoupon = await Coupon.create({
        code: 'TESTFLAT25K',
        description: '₹25,000 Inaugural Boutique Credit',
        discountType: 'FLAT_PAISE',
        discountValue: 2500000,
        minOrderValuePaise: 20000000, // ₹2,00,000 min order
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000 * 30),
        usageLimitPerUser: 1,
        isActive: true
      });

      // 3. Expired Coupon
      expiredCoupon = await Coupon.create({
        code: 'TESTEXPIRED',
        description: 'Expired privilege coupon',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        validFrom: new Date(Date.now() - 86400000 * 10),
        validUntil: new Date(Date.now() - 86400000 * 2), // Expired 2 days ago
        isActive: true
      });

      // 4. High Minimum Purchase Coupon
      minPurchaseCoupon = await Coupon.create({
        code: 'TESTHIGHMIN',
        description: 'High minimum coupon',
        discountType: 'FLAT_PAISE',
        discountValue: 5000000,
        minOrderValuePaise: 100000000, // ₹10,00,000 minimum
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000 * 30),
        isActive: true
      });
    });

    it('should validate coupon code via standalone probe endpoint', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          code: 'TESTROYAL10',
          items: [
            {
              productId: testProduct._id,
              variantId: testVariant._id,
              quantity: 1,
              priceInPaise: 35000000
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isValid).toBe(true);
      // 10% of 35000000 = 3500000, capped at maxDiscountLimitPaise (2000000)
      expect(res.body.data.discountPaise).toBe(2000000);
    });

    it('should reject expired coupon with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: expiredCoupon.code });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('expired');
    });

    it('should reject coupon when cart subtotal does not meet minimum order threshold', async () => {
      const res = await request(app)
        .post('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: minPurchaseCoupon.code });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Minimum order value');
    });

    it('should apply valid percentage coupon and enforce maximum discount cap', async () => {
      const res = await request(app)
        .post('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: percentageCoupon.code });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appliedCoupon.code).toBe(percentageCoupon.code);
      // 10% of ₹3,60,000 = ₹36,000 (3600000 paise), capped at ₹20,000 (2000000 paise)
      expect(res.body.data.pricing.couponDiscountPaise).toBe(2000000);
      expect(res.body.data.pricing.taxableAmountPaise).toBe(
        res.body.data.pricing.subtotalPaise - 2000000
      );
    });

    it('should remove coupon from cart', async () => {
      const res = await request(app)
        .delete('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.appliedCoupon).toBeNull();
      expect(res.body.data.pricing.couponDiscountPaise).toBe(0);
    });

    it('should apply flat paise coupon with exact integer reduction', async () => {
      const res = await request(app)
        .post('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: flatCoupon.code });

      expect(res.status).toBe(200);
      expect(res.body.data.appliedCoupon.code).toBe(flatCoupon.code);
      expect(res.body.data.pricing.couponDiscountPaise).toBe(2500000);
    });

    it('should reject coupon redemption when user exceeds usageLimitPerUser', async () => {
      // Simulate historical redemption by customerUser
      await Coupon.updateOne(
        { code: flatCoupon.code },
        {
          $push: {
            redemptions: {
              userId: customerUser._id,
              discountPaise: 2500000,
              redeemedAt: new Date()
            }
          }
        }
      );

      // Customer trying to reapply coupon should be blocked
      const res = await request(app)
        .post('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: flatCoupon.code });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('maximum permitted number of times');

      // Second customer who hasn't redeemed yet can still apply it
      // First populate secondCustomer's cart
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${secondCustomerToken}`)
        .send({
          variantId: testVariant._id,
          quantity: 1
        });

      const resSecond = await request(app)
        .post('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${secondCustomerToken}`)
        .send({ code: flatCoupon.code });

      expect(resSecond.status).toBe(200);
      expect(resSecond.body.data.appliedCoupon.code).toBe(flatCoupon.code);
    });
  });

  // ==========================================
  // 5. PROMOTIONAL OFFERS & STACKING RULES
  // ==========================================
  describe('5. Offers Management & Stacking Invariants', () => {
    let unstackableOffer;

    beforeAll(async () => {
      // Create active festive offer that prohibits stacking with coupons
      unstackableOffer = await Offer.create({
        title: 'Commerce Diwali Splendour 5% Off',
        slug: 'comm-test-diwali-splendour',
        description: '5% instant savings on diamond solitaires',
        discountType: 'PERCENTAGE',
        discountValue: 5,
        offerType: 'STOREWIDE',
        allowStackingWithCoupons: false, // Strict no stacking rule
        priority: 10,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000 * 15),
        isActive: true
      });
    });

    it('should automatically apply active storewide offer to cart calculation', async () => {
      // Clear coupon from secondCustomer cart
      await request(app)
        .delete('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${secondCustomerToken}`);

      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${secondCustomerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.appliedOffer).toBeDefined();
      expect(res.body.data.appliedOffer.title).toBe(unstackableOffer.title);
      // 5% of 35000000 = 1750000 paise (₹17,500)
      expect(res.body.data.pricing.offerDiscountPaise).toBe(1750000);
    });

    it('should reject coupon application when active offer prohibits coupon stacking', async () => {
      const res = await request(app)
        .post('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${secondCustomerToken}`)
        .send({ code: 'TESTROYAL10' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('cannot be combined with the currently active promotional offer');
    });
  });
});
