import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { app } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';
import { User } from '../../src/models/User.js';
import { Category } from '../../src/models/Category.js';
import { Collection } from '../../src/models/Collection.js';
import { Product } from '../../src/models/Product.js';
import { ProductVariant } from '../../src/models/ProductVariant.js';
import { Address } from '../../src/models/Address.js';
import { Cart } from '../../src/models/Cart.js';
import { Order } from '../../src/models/Order.js';
import { Payment } from '../../src/models/Payment.js';
import { InventoryLog } from '../../src/models/InventoryLog.js';
import { Coupon } from '../../src/models/Coupon.js';

describe('AUREVÉ Address Book, Checkout, Razorpay, COD & Order Lifecycle Tests', () => {
  let adminUser;
  let customerUser;
  let secondCustomer;
  let adminToken;
  let customerToken;
  let secondCustomerToken;

  let testCategory;
  let testCollection;
  let testProduct;
  let affordableVariant;
  let luxuryVariant;
  let customerAddress;
  let customerAddress2;

  const generateSignature = (orderId, paymentId) => {
    return crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  };

  const generateWebhookSig = (bodyStr) => {
    const secret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET;
    return crypto
      .createHmac('sha256', secret)
      .update(Buffer.from(bodyStr, 'utf-8'))
      .digest('hex');
  };

  beforeAll(async () => {
    await connectDatabase();

    // Clean up test data for specific test user accounts
    const existingUsers = await User.find({
      email: { $in: ['ord_admin@aureve-test.com', 'ord_cust1@aureve-test.com', 'ord_cust2@aureve-test.com'] }
    });
    const existingUserIds = existingUsers.map(u => u._id);
    await Address.deleteMany({ userId: { $in: existingUserIds } });
    await Cart.deleteMany({ userId: { $in: existingUserIds } });
    await Order.deleteMany({ userId: { $in: existingUserIds } });
    await User.deleteMany({ _id: { $in: existingUserIds } });
    await Category.deleteMany({ slug: { $regex: /^ord-test-/ } });
    await Collection.deleteMany({ slug: { $regex: /^ord-test-/ } });
    await Product.deleteMany({ sku: { $regex: /^ORD-PROD-/ } });
    await ProductVariant.deleteMany({ sku: { $regex: /^ORD-VAR-/ } });
    await Coupon.deleteMany({ code: { $regex: /^ORDCOUPON/ } });

    // Seed test users
    adminUser = await User.create({
      firstName: 'Rajyavardhan',
      lastName: 'Singhania',
      email: 'ord_admin@aureve-test.com',
      passwordHash: 'hashed_admin_pass',
      role: 'ADMIN',
      status: 'ACTIVE',
      isVerified: true
    });

    customerUser = await User.create({
      firstName: 'Ananya',
      lastName: 'Pandey',
      email: 'ord_cust1@aureve-test.com',
      passwordHash: 'hashed_cust1_pass',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      isVerified: true
    });

    secondCustomer = await User.create({
      firstName: 'Vikram',
      lastName: 'Oberoi',
      email: 'ord_cust2@aureve-test.com',
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

    // Seed catalog fixtures
    const mockImage = {
      url: 'https://res.cloudinary.com/aureve/image/upload/v1/catalog/ring.jpg',
      publicId: 'catalog/ring_id',
      alt: 'AUREVÉ Royal Bridal Suite'
    };

    testCategory = await Category.create({
      name: 'Order Test Rings',
      slug: 'ord-test-rings',
      description: 'Exclusive Solitaires for Checkout Testing',
      image: mockImage,
      status: 'ACTIVE'
    });

    testCollection = await Collection.create({
      name: 'Order Test Royal Collection',
      slug: 'ord-test-royal',
      tagline: 'Imperial Bridal Suites',
      story: 'Handcrafted diamond rings of immaculate cut and clarity.',
      bannerImage: mockImage,
      thumbnailImage: mockImage,
      status: 'ACTIVE'
    });

    testProduct = await Product.create({
      title: 'AUREVÉ Royal Nizam Solitaire',
      slug: 'ord-test-royal-nizam-solitaire',
      sku: 'ORD-PROD-001',
      description: 'Masterpiece solitaire ring with conflict-free diamonds.',
      categoryId: testCategory._id,
      collectionIds: [testCollection._id],
      status: 'PUBLISHED',
      pricing: {
        baseMetalPricePaise: 3000000,
        makingChargesPaise: 0,
        gstRate: 3
      },
      images: [
        {
          url: mockImage.url,
          publicId: mockImage.publicId,
          alt: 'Royal Nizam Solitaire',
          isPrimary: true
        }
      ]
    });

    // Affordable variant: ₹30,000 (3,000,000 paise) - within ₹50,000 COD limit
    affordableVariant = await ProductVariant.create({
      productId: testProduct._id,
      variantName: 'Solitaire Ring Size 12',
      sku: 'ORD-VAR-AFFORDABLE',
      size: '12',
      metalType: 'YELLOW_GOLD',
      metalPurity: '18K',
      grossWeightGrams: 5.0,
      netGoldWeightGrams: 4.0,
      diamondWeightCarat: 1.0,
      priceInPaise: 3000000,
      inventoryCount: 10,
      availability: 'AVAILABLE',
      isActive: true
    });

    // Luxury variant: ₹80,000 (8,000,000 paise) - exceeds ₹50,000 COD limit
    luxuryVariant = await ProductVariant.create({
      productId: testProduct._id,
      variantName: 'Solitaire Ring Size 16 Diamond Tier 1',
      sku: 'ORD-VAR-LUXURY',
      size: '16',
      metalType: 'YELLOW_GOLD',
      metalPurity: '18K',
      grossWeightGrams: 7.0,
      netGoldWeightGrams: 5.5,
      diamondWeightCarat: 2.5,
      priceInPaise: 8000000,
      inventoryCount: 5,
      availability: 'AVAILABLE',
      isActive: true
    });
  });

  afterAll(async () => {
    const userIds = [adminUser?._id, customerUser?._id, secondCustomer?._id].filter(Boolean);
    await Address.deleteMany({ userId: { $in: userIds } });
    await Cart.deleteMany({ userId: { $in: userIds } });
    await Order.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    await Category.deleteMany({ slug: { $regex: /^ord-test-/ } });
    await Collection.deleteMany({ slug: { $regex: /^ord-test-/ } });
    await Product.deleteMany({ sku: { $regex: /^ORD-PROD-/ } });
    await ProductVariant.deleteMany({ sku: { $regex: /^ORD-VAR-/ } });
    await Coupon.deleteMany({ code: { $regex: /^ORDCOUPON/ } });
    await disconnectDatabase();
  });

  // ==========================================
  // 1. Address Book Management & Validation
  // ==========================================
  describe('1. Address Book Management & Default Flag Reconciliation', () => {
    it('should reject address creation with invalid Indian PIN code or phone number', async () => {
      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fullName: 'Ananya Pandey',
          phone: '1234567890', // Must start with 6-9
          addressLine1: 'B-404, Gulmohar Enclave',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '999' // Must be 6 digits
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should create first address and automatically set as default shipping and billing', async () => {
      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fullName: 'Ananya Pandey',
          phone: '9876543210',
          addressLine1: 'B-404, Gulmohar Enclave, Juhu',
          landmark: 'Near Juhu Beach',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400049',
          country: 'India',
          addressType: 'HOME'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.address.isDefaultShipping).toBe(true);
      expect(res.body.data.address.isDefaultBilling).toBe(true);
      customerAddress = res.body.data.address;
    });

    it('should create second address and reconcile default flags upon request', async () => {
      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fullName: 'Ananya Pandey Office',
          phone: '9876543211',
          addressLine1: '1201, Maker Chambers V, Nariman Point',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400021',
          addressType: 'WORK',
          isDefaultShipping: true
        });

      expect(res.status).toBe(201);
      expect(res.body.data.address.isDefaultShipping).toBe(true);
      customerAddress2 = res.body.data.address;

      // Verify previous address lost default shipping flag
      const prev = await Address.findById(customerAddress._id);
      expect(prev.isDefaultShipping).toBe(false);
      expect(prev.isDefaultBilling).toBe(true); // Still default billing
    });

    it('should enforce customer ownership when updating or deleting addresses', async () => {
      // Second customer attempts to edit first customer's address
      const res = await request(app)
        .put(`/api/v1/addresses/${customerAddress._id}`)
        .set('Authorization', `Bearer ${secondCustomerToken}`)
        .send({ fullName: 'Malicious Hijack' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // 2. Checkout Summary Preview & Warnings
  // ==========================================
  describe('2. Checkout Summary Preview', () => {
    it('should reject checkout summary when cart is empty', async () => {
      const res = await request(app)
        .get('/api/v1/orders/checkout-summary')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/empty/i);
    });

    it('should return authoritative checkout breakdown, GST, shipping, and addresses', async () => {
      // Add affordable variant to cart
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ variantId: affordableVariant._id.toString(), quantity: 1 });

      const res = await request(app)
        .get('/api/v1/orders/checkout-summary')
        .set('Authorization', `Bearer ${customerToken}`)
        .query({ shippingAddressId: customerAddress._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.pricing.subtotalPaise).toBe(3000000); // ₹30,000
      expect(data.pricing.gstPaise).toBe(90000); // 3% of 30,000 = ₹900
      expect(data.pricing.shippingFeePaise).toBe(50000); // ₹500 (since < ₹50,000 threshold)
      expect(data.pricing.grandTotalPaise).toBe(3140000); // 30,000 + 900 + 500 = ₹31,400
      expect(data.isCheckoutReady).toBe(true);
      expect(data.codEligible).toBe(true);
      expect(data.shippingAddress._id).toBe(customerAddress._id.toString());
    });

    it('should reflect applied cart coupon and discounted grand total in checkout summary', async () => {
      // 1. Create active promotional coupon
      const testCoupon = await Coupon.create({
        code: 'ORDCOUPON20',
        description: '20% Off Test Privilege',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        minOrderValuePaise: 1000000,
        maxDiscountLimitPaise: 1000000,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
        isActive: true
      });

      // 2. Apply coupon to customer cart
      const applyRes = await request(app)
        .post('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'ORDCOUPON20' });

      expect(applyRes.status).toBe(200);
      expect(applyRes.body.data.appliedCoupon.code).toBe('ORDCOUPON20');
      const cartTotal = applyRes.body.data.pricing.grandTotalPaise;
      const cartDiscount = applyRes.body.data.pricing.couponDiscountPaise;
      expect(cartDiscount).toBe(600000); // 20% of ₹30,000 = ₹6,000

      // 3. Query checkout summary without passing coupon code (authoritative retrieval from Cart)
      const summaryRes = await request(app)
        .get('/api/v1/orders/checkout-summary')
        .set('Authorization', `Bearer ${customerToken}`)
        .query({ shippingAddressId: customerAddress._id.toString() });

      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.success).toBe(true);
      const summary = summaryRes.body.data;
      expect(summary.appliedCoupon).not.toBeNull();
      expect(summary.appliedCoupon.code).toBe('ORDCOUPON20');
      expect(summary.pricing.couponDiscountPaise).toBe(cartDiscount);
      expect(summary.pricing.grandTotalPaise).toBe(cartTotal);

      // Clean up coupon from cart
      await request(app)
        .delete('/api/v1/cart/coupon')
        .set('Authorization', `Bearer ${customerToken}`);
      await Coupon.deleteOne({ _id: testCoupon._id });
    });
  });

  // ==========================================
  // 3. Cash on Delivery (COD) Flow & Policy
  // ==========================================
  describe('3. Cash on Delivery (COD) Policy & Atomic Stock Deduction', () => {
    it('should reject COD when cart grand total exceeds ₹50,000 luxury threshold', async () => {
      // Clear cart and add luxury variant (₹80,000)
      await Cart.findOneAndUpdate({ userId: customerUser._id }, { items: [] });
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ variantId: luxuryVariant._id.toString(), quantity: 1 });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddressId: customerAddress._id.toString(),
          paymentMethod: 'COD'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/50,000/i);
    });

    it('should successfully place COD order, deduct stock, log inventory, and clear cart', async () => {
      // Put affordable variant back in cart (stock: 10)
      await Cart.findOneAndUpdate({ userId: customerUser._id }, { items: [] });
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ variantId: affordableVariant._id.toString(), quantity: 1 });

      const stockBefore = (await ProductVariant.findById(affordableVariant._id)).inventoryCount;

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddressId: customerAddress._id.toString(),
          paymentMethod: 'COD',
          idempotencyKey: 'IDEMP-COD-001'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const order = res.body.data.order;
      expect(order.orderNumber).toMatch(/^AUR-/);
      expect(order.orderStatus).toBe('CONFIRMED');
      expect(order.paymentStatus).toBe('PENDING');
      expect(order.paymentMethod).toBe('COD');
      expect(order.financialBreakdown.subtotalPaise).toBe(3000000); // 1 * 30,000 = ₹30,000

      // Verify stock was atomically decremented by 1
      const stockAfter = (await ProductVariant.findById(affordableVariant._id)).inventoryCount;
      expect(stockAfter).toBe(stockBefore - 1);

      // Verify InventoryLog was written
      const invLog = await InventoryLog.findOne({ orderId: order._id });
      expect(invLog).not.toBeNull();
      expect(invLog.movementType).toBe('PURCHASE_DEDUCTION');
      expect(invLog.quantityChanged).toBe(-1);

      // Verify Payment record was initialized
      const payment = await Payment.findOne({ orderId: order._id });
      expect(payment).not.toBeNull();
      expect(payment.gateway).toBe('COD');
      expect(payment.status).toBe('PENDING');

      // Verify customer cart was cleared
      const cart = await Cart.findOne({ userId: customerUser._id });
      expect(cart.items.length).toBe(0);
    });

    it('should return existing order when same idempotency key is resubmitted', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddressId: customerAddress._id.toString(),
          paymentMethod: 'COD',
          idempotencyKey: 'IDEMP-COD-001'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isDuplicate).toBe(true);
      expect(res.body.data.order.idempotencyKey).toBe('IDEMP-COD-001');
    });
  });

  // ==========================================
  // 4. Razorpay Online Payment & Verification
  // ==========================================
  describe('4. Razorpay Online Payment Initiation, Verification & Idempotency', () => {
    let razorpayPendingOrder;

    it('should create PENDING order and return Razorpay gateway details', async () => {
      // Add luxury piece to cart
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ variantId: luxuryVariant._id.toString(), quantity: 1 });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddressId: customerAddress._id.toString(),
          paymentMethod: 'RAZORPAY'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.order.orderStatus).toBe('PENDING');
      expect(data.order.paymentStatus).toBe('PENDING');
      expect(data.order.razorpayOrderId).toBeTruthy();
      expect(data.razorpay).toBeTruthy();
      expect(data.razorpay.amountPaise).toBe(data.order.financialBreakdown.grandTotalPaise);

      razorpayPendingOrder = data.order;
    });

    it('should reject payment verification when HMAC signature is forged or tampered', async () => {
      const res = await request(app)
        .post('/api/v1/payments/verify-signature')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          razorpay_order_id: razorpayPendingOrder.razorpayOrderId,
          razorpay_payment_id: 'pay_tampered_123',
          razorpay_signature: 'invalid_signature_hex_1234567890abcdef1234567890abcdef'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/signature verification failed/i);
    });

    it('should verify genuine Razorpay signature, commit order to PAID, and deduct stock', async () => {
      const paymentId = `pay_mock_${Date.now()}`;
      const validSig = generateSignature(razorpayPendingOrder.razorpayOrderId, paymentId);
      const stockBefore = (await ProductVariant.findById(luxuryVariant._id)).inventoryCount;

      const res = await request(app)
        .post('/api/v1/payments/verify-signature')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          razorpay_order_id: razorpayPendingOrder.razorpayOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSig
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.paymentStatus).toBe('PAID');
      expect(res.body.data.order.orderStatus).toBe('CONFIRMED');

      // Verify stock deducted
      const stockAfter = (await ProductVariant.findById(luxuryVariant._id)).inventoryCount;
      expect(stockAfter).toBe(stockBefore - 1);

      // Verify Payment entity created
      const payment = await Payment.findOne({ transactionId: paymentId });
      expect(payment).not.toBeNull();
      expect(payment.status).toBe('CAPTURED');
      expect(payment.gateway).toBe('RAZORPAY');
    });

    it('should handle duplicate payment verification idempotently without double stock deduction', async () => {
      const paymentId = `pay_dup_${Date.now()}`;
      const validSig = generateSignature(razorpayPendingOrder.razorpayOrderId, paymentId);
      const stockBefore = (await ProductVariant.findById(luxuryVariant._id)).inventoryCount;

      const res = await request(app)
        .post('/api/v1/payments/verify-signature')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          razorpay_order_id: razorpayPendingOrder.razorpayOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSig
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isIdempotent).toBe(true);

      // Stock must NOT have decremented again
      const stockAfter = (await ProductVariant.findById(luxuryVariant._id)).inventoryCount;
      expect(stockAfter).toBe(stockBefore);
    });
  });

  // ==========================================
  // 5. Razorpay Webhooks Handling
  // ==========================================
  describe('5. Razorpay Webhook Processing & Security', () => {
    it('should reject webhook with invalid signature', async () => {
      const payload = JSON.stringify({ event: 'payment.captured' });
      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', 'forged_webhook_signature')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid webhook signature/i);
    });

    it('should process payment.captured webhook idempotently', async () => {
      // Create a fresh pending order for webhook test
      const pendingOrder = await Order.create({
        orderNumber: `AUR-WH-${Date.now()}`,
        userId: customerUser._id,
        items: [
          {
            productId: testProduct._id,
            variantId: affordableVariant._id,
            title: 'Webhook Ring',
            sku: 'ORD-VAR-AFFORDABLE',
            quantity: 1,
            unitPricePaise: 3000000,
            totalPaise: 3000000
          }
        ],
        shippingAddress: { fullName: 'Webhook Customer', phone: '9876543210', city: 'Delhi', state: 'Delhi', postalCode: '110001', addressLine1: 'Line 1' },
        billingAddress: { fullName: 'Webhook Customer', phone: '9876543210', city: 'Delhi', state: 'Delhi', postalCode: '110001', addressLine1: 'Line 1' },
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'PENDING',
        orderStatus: 'PENDING',
        razorpayOrderId: `order_wh_${Date.now()}`,
        financialBreakdown: {
          subtotalPaise: 3000000,
          grandTotalPaise: 3140000
        }
      });

      const webhookPayload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_wh_${Date.now()}`,
              order_id: pendingOrder.razorpayOrderId,
              amount: 3140000,
              status: 'captured'
            }
          }
        }
      });

      const sig = generateWebhookSig(webhookPayload);

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', sig)
        .set('Content-Type', 'application/json')
        .send(webhookPayload);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      // Verify order updated to PAID
      const updated = await Order.findById(pendingOrder._id);
      expect(updated.paymentStatus).toBe('PAID');
      expect(updated.orderStatus).toBe('CONFIRMED');

      // Resending same webhook should be acknowledged idempotently
      const res2 = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', sig)
        .set('Content-Type', 'application/json')
        .send(webhookPayload);

      expect(res2.status).toBe(200);
      expect(res2.body.idempotent).toBe(true);
    });
  });

  // ==========================================
  // 6. Customer Order Lifecycle & Cancellation
  // ==========================================
  describe('6. Customer Order Lifecycle & Stock Restitution', () => {
    let orderToCancel;

    it('should retrieve customer order history', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
      orderToCancel = res.body.data.orders[0];
    });

    it('should view single order details and forbid unauthorized customer', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${orderToCancel.orderNumber}`)
        .set('Authorization', `Bearer ${secondCustomerToken}`);

      expect(res.status).toBe(403);
    });

    it('should cancel eligible order, restore variant stock, and write restitution log', async () => {
      // Find one variant in the order to check stock restitution
      const firstItem = orderToCancel.items[0];
      const stockBefore = (await ProductVariant.findById(firstItem.variantId)).inventoryCount;

      const res = await request(app)
        .post(`/api/v1/orders/${orderToCancel.orderNumber}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Changed mind about the metal finish.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderStatus).toBe('CANCELLED');

      // Verify stock was restored
      const stockAfter = (await ProductVariant.findById(firstItem.variantId)).inventoryCount;
      expect(stockAfter).toBe(stockBefore + firstItem.quantity);

      // Verify InventoryLog was written with restitution
      const log = await InventoryLog.findOne({
        orderId: orderToCancel._id,
        movementType: 'ORDER_CANCELLATION_RESTITUTION'
      });
      expect(log).not.toBeNull();
      expect(log.quantityChanged).toBe(firstItem.quantity);
    });

    it('should reject cancellation of an already cancelled order', async () => {
      const res = await request(app)
        .post(`/api/v1/orders/${orderToCancel.orderNumber}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Attempt cancel again' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot be cancelled/i);
    });
  });

  // ==========================================
  // 7. Administrative Order Management & Fulfillment
  // ==========================================
  describe('7. Administrative Order Tracking & Status Transitions', () => {
    let adminTestOrder;

    beforeAll(async () => {
      adminTestOrder = await Order.create({
        orderNumber: `AUR-ADM-${Date.now()}`,
        userId: customerUser._id,
        items: [
          {
            productId: testProduct._id,
            variantId: affordableVariant._id,
            title: 'Admin Ring Piece',
            sku: 'ORD-VAR-AFFORDABLE',
            quantity: 1,
            unitPricePaise: 3000000,
            totalPaise: 3000000
          }
        ],
        shippingAddress: { fullName: 'Admin Cust', phone: '9876543210', city: 'Jaipur', state: 'Rajasthan', postalCode: '302001', addressLine1: 'Civil Lines' },
        billingAddress: { fullName: 'Admin Cust', phone: '9876543210', city: 'Jaipur', state: 'Rajasthan', postalCode: '302001', addressLine1: 'Civil Lines' },
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'CONFIRMED',
        financialBreakdown: {
          subtotalPaise: 3000000,
          grandTotalPaise: 3140000
        }
      });
    });

    it('should allow admin to list all customer orders with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orders.length).toBeGreaterThan(0);
    });

    it('should reject invalid status transition (e.g. CONFIRMED directly to DELIVERED)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/orders/${adminTestOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DELIVERED' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot transition order status/i);
    });

    it('should permit valid status progression and update tracking metadata', async () => {
      // 1. Move to PROCESSING
      const res1 = await request(app)
        .patch(`/api/v1/admin/orders/${adminTestOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PROCESSING', message: 'Being hand-crafted at Mumbai atelier' });

      expect(res1.status).toBe(200);
      expect(res1.body.data.order.orderStatus).toBe('PROCESSING');

      // 2. Move to SHIPPED with tracking details
      const res2 = await request(app)
        .patch(`/api/v1/admin/orders/${adminTestOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'SHIPPED',
          courierName: 'BVC Luxury Logistics',
          trackingNumber: 'BVC987654321IN',
          trackingUrl: 'https://bvclogistics.com/track/BVC987654321IN'
        });

      expect(res2.status).toBe(200);
      const updated = res2.body.data.order;
      expect(updated.orderStatus).toBe('SHIPPED');
      expect(updated.tracking.courierName).toBe('BVC Luxury Logistics');
      expect(updated.tracking.trackingNumber).toBe('BVC987654321IN');
      expect(updated.tracking.statusTimeline.length).toBeGreaterThanOrEqual(2);
    });
  });
});
