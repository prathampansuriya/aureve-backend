import crypto from 'crypto';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Cart } from '../models/Cart.js';
import { Coupon } from '../models/Coupon.js';
import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { addressService } from './addressService.js';
import { pricingService } from './pricingService.js';
import { couponService } from './couponService.js';
import { razorpayService } from './razorpayService.js';
import { createPersistentNotification } from './notificationService.js';
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from './emailService.js';
import { env } from '../config/env.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

// Maximum order amount permitted for Cash on Delivery: ₹50,000 (5,000,000 paise)
const MAX_COD_AMOUNT_PAISE = 5000000;

export class OrderService {
  /**
   * Generates a preview order summary for checkout without creating a persistent order.
   */
  async getCheckoutSummary(userId, { shippingAddressId, billingAddressId, couponCode } = {}) {
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestError('Your shopping cart is empty.');
    }

    // Resolve shipping address
    let shippingAddress = null;
    if (shippingAddressId) {
      shippingAddress = await addressService.getAddressById(userId, shippingAddressId);
    } else {
      const addresses = await addressService.getAddresses(userId);
      shippingAddress = addresses.find(a => a.isDefaultShipping) || addresses[0] || null;
    }

    // Resolve billing address
    let billingAddress = null;
    if (billingAddressId) {
      billingAddress = await addressService.getAddressById(userId, billingAddressId);
    } else if (shippingAddress) {
      const addresses = await addressService.getAddresses(userId);
      billingAddress = addresses.find(a => a.isDefaultBilling) || shippingAddress;
    }

    // Check inventory and publication status for all cart items
    const warnings = [];
    const variantIds = cart.items.map(item => item.variantId);
    const variants = await ProductVariant.find({ _id: { $in: variantIds } });
    const productIds = variants.map(v => v.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const variantsMap = new Map(variants.map(v => [v._id.toString(), v]));
    const productsMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of cart.items) {
      const variant = variantsMap.get(item.variantId.toString());
      if (!variant) {
        warnings.push(`One of the items in your cart is no longer available.`);
        continue;
      }
      const product = productsMap.get(variant.productId.toString());
      const availableStock = variant.inventoryCount !== undefined ? variant.inventoryCount : 0;
      if (!product || product.status !== 'PUBLISHED') {
        warnings.push(`"${product ? product.title : 'An item'}" is currently unavailable.`);
      } else if (availableStock < item.quantity) {
        warnings.push(`"${product.title}" has only ${availableStock} item(s) in stock.`);
      }
    }

    // Resolve coupon code from query, cart snapshot, or cart.couponId
    let effectiveCouponCode = couponCode || cart.appliedCouponCode || null;
    if (!effectiveCouponCode && cart.couponId) {
      const couponDoc = await Coupon.findById(cart.couponId);
      if (couponDoc && couponDoc.isValidNow()) {
        effectiveCouponCode = couponDoc.code;
      }
    }

    // Calculate authoritative pricing
    const pricing = await pricingService.calculateCartPricing(cart.items, effectiveCouponCode, userId);

    const isCheckoutReady = warnings.length === 0 && Boolean(shippingAddress);

    return {
      items: pricing.items,
      pricing: {
        subtotalPaise: pricing.subtotalPaise,
        makingChargesPaise: pricing.makingChargesPaise,
        discountPaise: pricing.discountPaise ?? pricing.totalDiscountPaise ?? 0,
        totalDiscountPaise: pricing.totalDiscountPaise ?? pricing.discountPaise ?? 0,
        couponDiscountPaise: pricing.couponDiscountPaise || 0,
        offerDiscountPaise: pricing.offerDiscountPaise || 0,
        taxableAmountPaise: pricing.taxableAmountPaise,
        gstRate: pricing.gstRate || 3,
        gstPaise: pricing.gstPaise,
        shippingFeePaise: pricing.shippingFeePaise,
        grandTotalPaise: pricing.grandTotalPaise
      },
      appliedCoupon: pricing.appliedCoupon,
      appliedOffer: pricing.appliedOffer,
      shippingAddress,
      billingAddress,
      isCheckoutReady,
      warnings,
      codEligible: pricing.grandTotalPaise <= MAX_COD_AMOUNT_PAISE
    };
  }

  /**
   * Creates an order from the user's active cart.
   * Handles idempotency, address snapshotting, inventory verification, and payment gateway setup.
   */
  async createOrder(userId, orderData, _clientIp = '127.0.0.1') {
    const { shippingAddressId, billingAddressId, paymentMethod, idempotencyKey, giftDetails, couponCode } = orderData;

    // 1. Idempotency check
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ userId, idempotencyKey });
      if (existingOrder) {
        logger.info(`Duplicate order submission intercepted via idempotency key: ${idempotencyKey}`);
        return {
          order: existingOrder,
          isDuplicate: true,
          razorpay: existingOrder.razorpayOrderId
            ? {
                keyId: env.RAZORPAY_KEY_ID,
                orderId: existingOrder.razorpayOrderId,
                amountPaise: existingOrder.financialBreakdown.grandTotalPaise,
                currency: 'INR',
                orderNumber: existingOrder.orderNumber
              }
            : null
        };
      }
    }

    // 2. Retrieve user cart
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestError('Your cart is empty. Please add pieces to checkout.');
    }

    // 3. Validate shipping and billing addresses
    const shippingAddress = await addressService.getAddressById(userId, shippingAddressId);
    const billingAddress = billingAddressId
      ? await addressService.getAddressById(userId, billingAddressId)
      : shippingAddress;

    // 4. Validate variants, publication status, and stock
    const variantIds = cart.items.map(item => item.variantId);
    const variants = await ProductVariant.find({ _id: { $in: variantIds } });
    const productIds = variants.map(v => v.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const variantsMap = new Map(variants.map(v => [v._id.toString(), v]));
    const productsMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of cart.items) {
      const variant = variantsMap.get(item.variantId.toString());
      if (!variant) {
        throw new BadRequestError('An item in your cart no longer exists.');
      }
      const product = productsMap.get(variant.productId.toString());
      const availableStock = variant.inventoryCount !== undefined ? variant.inventoryCount : 0;
      if (!product || product.status !== 'PUBLISHED') {
        throw new BadRequestError(`"${product ? product.title : 'A piece'}" is no longer published for sale.`);
      }
      if (availableStock < item.quantity) {
        throw new BadRequestError(`Insufficient stock for "${product.title}". Only ${availableStock} left.`);
      }
    }

    // 5. Authoritative recalculation of all line items, offers, coupons, GST, and shipping
    let effectiveCouponCode = couponCode || cart.appliedCouponCode || null;
    if (!effectiveCouponCode && cart.couponId) {
      const couponDoc = await Coupon.findById(cart.couponId);
      if (couponDoc && couponDoc.isValidNow()) {
        effectiveCouponCode = couponDoc.code;
      }
    }
    const pricing = await pricingService.calculateCartPricing(cart.items, effectiveCouponCode, userId);

    // 6. COD specific eligibility rule
    if (paymentMethod === 'COD' && pricing.grandTotalPaise > MAX_COD_AMOUNT_PAISE) {
      throw new BadRequestError(
        'Cash on Delivery is limited to orders up to ₹50,000 for luxury security. Please choose Razorpay online payment.'
      );
    }

    // 7. Generate deterministic orderNumber and assemble immutable item snapshots
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const orderNumber = `AUR-${dateStr}-${randomHex}`;

    const orderItemSnapshots = cart.items.map(item => {
      const variant = variantsMap.get(item.variantId.toString());
      const product = productsMap.get(variant.productId.toString());
      const linePricing = pricing.items?.find(p => p.variantId.toString() === item.variantId.toString());

      return {
        productId: product._id,
        variantId: variant._id,
        title: product.title,
        sku: variant.sku,
        quantity: item.quantity,
        unitPricePaise: linePricing?.unitPricePaise || variant.priceInPaise,
        makingChargesPaise: linePricing?.makingChargesPaise || 0,
        gstPaise: linePricing?.gstPaise || 0,
        totalPaise: linePricing?.lineTotalPaise || linePricing?.totalPaise || (variant.priceInPaise * item.quantity),
        image: variant.variantSpecificMedia?.[0]?.url || variant.images?.[0]?.url || product.images?.[0]?.url || '',
        metalSpecifications: {
          metalType: variant.metalType || product.metal?.metalType || '',
          metalPurity: variant.metalPurity || product.metal?.metalPurity || '',
          size: variant.size || '',
          grossWeightGrams: variant.grossWeightGrams || product.weightGrams || 0
        },
        certificateNumber: variant.huid || product.hallmarking?.huid || ''
      };
    });

    const shippingSnapshot = {
      fullName: shippingAddress.fullName,
      phone: shippingAddress.phone,
      alternatePhone: shippingAddress.alternatePhone || '',
      addressLine1: shippingAddress.addressLine1,
      addressLine2: shippingAddress.addressLine2 || '',
      landmark: shippingAddress.landmark || '',
      city: shippingAddress.city,
      state: shippingAddress.state,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country
    };

    const billingSnapshot = {
      fullName: billingAddress.fullName,
      phone: billingAddress.phone,
      alternatePhone: billingAddress.alternatePhone || '',
      addressLine1: billingAddress.addressLine1,
      addressLine2: billingAddress.addressLine2 || '',
      landmark: billingAddress.landmark || '',
      city: billingAddress.city,
      state: billingAddress.state,
      postalCode: billingAddress.postalCode,
      country: billingAddress.country
    };

    // 8. Order creation branch based on payment method
    if (paymentMethod === 'COD') {
      // For COD, order is immediately CONFIRMED; atomically deduct stock
      const updatedVariants = [];
      try {
        for (const item of cart.items) {
          const updated = await ProductVariant.findOneAndUpdate(
            { _id: item.variantId, inventoryCount: { $gte: item.quantity } },
            { $inc: { inventoryCount: -item.quantity } },
            { new: true }
          );

          if (!updated) {
            throw new BadRequestError('Inventory race condition: insufficient stock for one of your selected pieces.');
          }

          updatedVariants.push({
            variantId: item.variantId,
            productId: updated.productId,
            quantity: item.quantity,
            prevStock: updated.inventoryCount + item.quantity,
            newStock: updated.inventoryCount
          });
        }
      } catch (err) {
        // Rollback already decremented variants
        for (const uv of updatedVariants) {
          await ProductVariant.findByIdAndUpdate(uv.variantId, { $inc: { inventoryCount: uv.quantity } });
        }
        throw err;
      }

      // Create confirmed COD order
      const order = await Order.create({
        orderNumber,
        userId,
        items: orderItemSnapshots,
        shippingAddress: shippingSnapshot,
        billingAddress: billingSnapshot,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'CONFIRMED',
        idempotencyKey: idempotencyKey || null,
        financialBreakdown: {
          subtotalPaise: pricing.subtotalPaise,
          makingChargesPaise: pricing.makingChargesPaise,
          gstPaise: pricing.gstPaise,
          discountPaise: pricing.discountPaise ?? pricing.totalDiscountPaise ?? 0,
          shippingFeePaise: pricing.shippingFeePaise,
          grandTotalPaise: pricing.grandTotalPaise
        },
        couponApplied: pricing.appliedCoupon
          ? {
              code: pricing.appliedCoupon.code,
              discountPaise: pricing.couponDiscountPaise
            }
          : { code: null, discountPaise: 0 },
        tracking: {
          statusTimeline: [
            {
              status: 'CONFIRMED',
              message: 'Cash on Delivery order placed successfully. Awaiting dispatch confirmation.',
              timestamp: new Date()
            }
          ]
        },
        giftDetails: giftDetails || { isGift: false }
      });

      // Write inventory log for each item
      for (const uv of updatedVariants) {
        await InventoryLog.create({
          variantId: uv.variantId,
          productId: uv.productId,
          orderId: order._id,
          movementType: 'PURCHASE_DEDUCTION',
          quantityChanged: -uv.quantity,
          previousQuantity: uv.prevStock,
          newQuantity: uv.newStock,
          performedBy: userId,
          reason: `COD Order Placed: ${order.orderNumber}`
        });
      }

      // Record coupon redemption if coupon applied
      if (pricing.appliedCoupon) {
        await couponService.recordRedemption(pricing.appliedCoupon.code, userId, order._id);
      }

      // Create Payment tracking record
      await Payment.create({
        orderId: order._id,
        transactionId: `COD_${order.orderNumber}`,
        gateway: 'COD',
        amountPaise: pricing.grandTotalPaise,
        currency: 'INR',
        method: 'COD',
        status: 'PENDING'
      });

      // Clear customer cart
      await Cart.findOneAndUpdate({ userId }, { items: [], appliedCouponCode: null, couponId: null });

      // Customer notification & transactional confirmation email
      const customer = await User.findById(userId).select('name email');
      if (customer) {
        sendOrderConfirmationEmail({ to: customer.email, name: customer.name, order }).catch(() => {});
      }

      await createPersistentNotification({
        userId,
        title: 'Order Confirmed',
        message: `Your Cash on Delivery order ${order.orderNumber} for ₹${(pricing.grandTotalPaise / 100).toLocaleString('en-IN')} has been confirmed.`,
        type: 'ORDER_UPDATE',
        linkUrl: `/account/orders/${order.orderNumber}`,
        idempotencyKey: `notif-order-cod-${order._id}`
      });

      return { order, payment: { method: 'COD' } };
    }

    // Razorpay Flow: Create PENDING order and initiate Razorpay gateway order
    const order = await Order.create({
      orderNumber,
      userId,
      items: orderItemSnapshots,
      shippingAddress: shippingSnapshot,
      billingAddress: billingSnapshot,
      paymentMethod: 'RAZORPAY',
      paymentStatus: 'PENDING',
      orderStatus: 'PENDING',
      idempotencyKey: idempotencyKey || null,
      financialBreakdown: {
        subtotalPaise: pricing.subtotalPaise,
        makingChargesPaise: pricing.makingChargesPaise,
        gstPaise: pricing.gstPaise,
        discountPaise: pricing.discountPaise ?? pricing.totalDiscountPaise ?? 0,
        shippingFeePaise: pricing.shippingFeePaise,
        grandTotalPaise: pricing.grandTotalPaise
      },
      couponApplied: pricing.appliedCoupon
        ? {
            code: pricing.appliedCoupon.code,
            discountPaise: pricing.couponDiscountPaise
          }
        : { code: null, discountPaise: 0 },
      tracking: {
        statusTimeline: [
          {
            status: 'PENDING',
            message: 'Checkout initiated. Awaiting online payment authorization.',
            timestamp: new Date()
          }
        ]
      },
      giftDetails: giftDetails || { isGift: false }
    });

    const gatewayOrder = await razorpayService.createGatewayOrder({
      amountPaise: pricing.grandTotalPaise,
      currency: 'INR',
      receipt: order.orderNumber,
      notes: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: userId.toString()
      }
    });

    order.razorpayOrderId = gatewayOrder.id;
    await order.save();

    return {
      order,
      razorpay: {
        keyId: env.RAZORPAY_KEY_ID,
        orderId: gatewayOrder.id,
        amountPaise: pricing.grandTotalPaise,
        currency: 'INR',
        orderNumber: order.orderNumber
      }
    };
  }

  /**
   * Verifies Razorpay checkout HMAC signature and commits the order to PAID status.
   * Atomically decrements stock, records inventory logs, redeems coupons, and clears cart.
   */
  async verifyPayment(userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    // 1. Verify cryptographic signature
    const isValid = razorpayService.verifyPaymentSignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature
    });

    if (!isValid) {
      logger.warn(`Tampered Razorpay payment signature detected for gateway order: ${razorpay_order_id}`);
      throw new BadRequestError('Payment signature verification failed. Possible tampering detected.');
    }

    // 2. Locate order by gateway identifier
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) {
      throw new NotFoundError('Order associated with this payment transaction was not found.');
    }

    // Verify ownership
    if (order.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to verify payment for this order.');
    }

    // 3. Idempotent check: If already paid, return existing success state
    if (order.paymentStatus === 'PAID') {
      logger.info(`Duplicate payment verification received for already fulfilled order: ${order.orderNumber}`);
      return {
        message: 'Payment already processed and order confirmed.',
        order,
        isIdempotent: true
      };
    }

    // 4. Atomically decrement stock for all items
    const updatedVariants = [];
    try {
      for (const item of order.items) {
        const updated = await ProductVariant.findOneAndUpdate(
          { _id: item.variantId, inventoryCount: { $gte: item.quantity } },
          { $inc: { inventoryCount: -item.quantity } },
          { new: true }
        );

        if (!updated) {
          logger.error(`Stock exhaustion after payment capture on variant: ${item.variantId}`);
        } else {
          updatedVariants.push({
            variantId: item.variantId,
            productId: updated.productId,
            quantity: item.quantity,
            prevStock: updated.inventoryCount + item.quantity,
            newStock: updated.inventoryCount
          });
        }
      }
    } catch (err) {
      logger.error('Error updating stock during payment verification:', err);
    }

    // Record inventory logs
    for (const uv of updatedVariants) {
      await InventoryLog.create({
        variantId: uv.variantId,
        productId: uv.productId,
        orderId: order._id,
        movementType: 'PURCHASE_DEDUCTION',
        quantityChanged: -uv.quantity,
        previousQuantity: uv.prevStock,
        newQuantity: uv.newStock,
        performedBy: userId,
        reason: `Payment Verified: ${order.orderNumber}`
      });
    }

    // 5. Record coupon redemption if coupon applied
    if (order.couponApplied?.code) {
      await couponService.recordRedemption(order.couponApplied.code, userId, order._id);
    }

    // 6. Clear customer cart
    await Cart.findOneAndUpdate({ userId }, { items: [], appliedCouponCode: null, couponId: null });

    // 7. Update order to CONFIRMED and PAID
    order.paymentStatus = 'PAID';
    order.orderStatus = 'CONFIRMED';
    order.tracking.statusTimeline.push({
      status: 'CONFIRMED',
      message: 'Payment received successfully via Razorpay. Order is confirmed.',
      timestamp: new Date()
    });
    await order.save();

    // 8. Record / update payment entity
    await Payment.findOneAndUpdate(
      { transactionId: razorpay_payment_id },
      {
        orderId: order._id,
        transactionId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        razorpaySignature: razorpay_signature,
        gateway: 'RAZORPAY',
        amountPaise: order.financialBreakdown.grandTotalPaise,
        currency: 'INR',
        status: 'CAPTURED',
        method: 'CARD' // Gateway captures method dynamically
      },
      { upsert: true, new: true }
    );

    // 9. Dispatch notification & transactional confirmation email
    const customer = await User.findById(userId).select('name email');
    if (customer) {
      sendOrderConfirmationEmail({ to: customer.email, name: customer.name, order }).catch(() => {});
    }

    await createPersistentNotification({
      userId,
      title: 'Payment Successful & Order Confirmed',
      message: `Your payment of ₹${(order.financialBreakdown.grandTotalPaise / 100).toLocaleString('en-IN')} for order ${order.orderNumber} was successful.`,
      type: 'ORDER_UPDATE',
      linkUrl: `/account/orders/${order.orderNumber}`,
      idempotencyKey: `notif-order-paid-${order._id}`
    });

    return {
      message: 'Payment verified successfully and order confirmed.',
      order
    };
  }

  /**
   * Processes asynchronous Razorpay webhook events with signature verification and idempotency.
   */
  async handleRazorpayWebhook(rawBody, signature) {
    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      logger.warn('Razorpay webhook HMAC signature verification failed.');
      throw new BadRequestError('Invalid webhook signature.');
    }

    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf-8'));
    const eventType = event.event;
    logger.info(`Received Razorpay webhook event: ${eventType}`);

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload.payment?.entity;
      const gatewayOrderId = paymentEntity?.order_id || event.payload.order?.entity?.id;
      const paymentId = paymentEntity?.id;

      if (!gatewayOrderId) {
        return { received: true, message: 'Missing order_id in webhook payload.' };
      }

      const order = await Order.findOne({ razorpayOrderId: gatewayOrderId });
      if (!order) {
        logger.warn(`Webhook received for unknown gateway order: ${gatewayOrderId}`);
        return { received: true, message: 'Order not found.' };
      }

      if (order.paymentStatus === 'PAID') {
        logger.info(`Webhook event for already fulfilled order: ${order.orderNumber}. Acknowledging.`);
        return { received: true, idempotent: true };
      }

      // Mark order paid and execute fulfillment
      order.paymentStatus = 'PAID';
      order.orderStatus = 'CONFIRMED';
      order.tracking.statusTimeline.push({
        status: 'CONFIRMED',
        message: 'Payment captured via Razorpay webhook confirmation.',
        timestamp: new Date()
      });
      await order.save();

      // Deduct inventory if not already deducted
      for (const item of order.items) {
        await ProductVariant.findByIdAndUpdate(item.variantId, { $inc: { inventoryCount: -item.quantity } });
      }

      // Record coupon redemption
      if (order.couponApplied?.code) {
        await couponService.recordRedemption(order.couponApplied.code, order.userId, order._id);
      }

      // Clear cart
      await Cart.findOneAndUpdate({ userId: order.userId }, { items: [], appliedCouponCode: null, couponId: null });

      // Upsert payment record
      if (paymentId) {
        await Payment.findOneAndUpdate(
          { transactionId: paymentId },
          {
            orderId: order._id,
            transactionId: paymentId,
            razorpayOrderId: gatewayOrderId,
            gateway: 'RAZORPAY',
            amountPaise: order.financialBreakdown.grandTotalPaise,
            currency: 'INR',
            status: 'CAPTURED'
          },
          { upsert: true }
        );
      }

      return { received: true, fulfilled: true };
    }

    if (eventType === 'payment.failed') {
      const paymentEntity = event.payload.payment?.entity;
      const gatewayOrderId = paymentEntity?.order_id;
      if (gatewayOrderId) {
        const order = await Order.findOne({ razorpayOrderId: gatewayOrderId });
        if (order && order.paymentStatus === 'PENDING') {
          order.paymentStatus = 'FAILED';
          order.tracking.statusTimeline.push({
            status: 'PENDING',
            message: `Payment failed: ${paymentEntity?.error_description || 'Transaction declined by bank.'}`,
            timestamp: new Date()
          });
          await order.save();
        }
      }
      return { received: true };
    }

    if (eventType === 'refund.processed') {
      const refundEntity = event.payload.refund?.entity;
      const paymentId = refundEntity?.payment_id;
      if (paymentId) {
        const payment = await Payment.findOne({ transactionId: paymentId });
        if (payment) {
          payment.status = 'REFUNDED';
          payment.refundDetails = {
            refundId: refundEntity.id,
            amountPaise: refundEntity.amount,
            refundedAt: new Date(),
            reason: refundEntity.notes?.reason || 'Webhook refund confirmation'
          };
          await payment.save();

          await Order.findByIdAndUpdate(payment.orderId, {
            paymentStatus: 'REFUNDED',
            orderStatus: 'REFUNDED'
          });
        }
      }
      return { received: true };
    }

    return { received: true, unhandled: true };
  }

  /**
   * Retrieves paginated order history for the authenticated customer.
   */
  async getCustomerOrders(userId, { page = 1, limit = 10, status } = {}) {
    const filter = { userId };
    if (status) {
      filter.orderStatus = status;
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ placedAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter)
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Retrieves full details for a single order with customer ownership check (or administrative access).
   */
  async getOrderDetails(userOrId, orderIdentifier) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(orderIdentifier);
    const filter = isObjectId ? { _id: orderIdentifier } : { orderNumber: orderIdentifier.toUpperCase() };

    const order = await Order.findOne(filter);
    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    const requesterId = userOrId?._id ? userOrId._id.toString() : userOrId?.toString();
    const requesterRole = userOrId?.role;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(requesterRole);

    if (!isAdmin && order.userId.toString() !== requesterId) {
      throw new ForbiddenError('You do not have permission to view this order.');
    }

    const payment = await Payment.findOne({ orderId: order._id });

    return { order, payment };
  }

  /**
   * Customer-initiated cancellation for eligible orders.
   * Restores variant inventory, initiates Razorpay refund if paid, and records audit trail.
   */
  async cancelOrder(userId, orderIdentifier, { reason }) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(orderIdentifier);
    const filter = isObjectId ? { _id: orderIdentifier } : { orderNumber: orderIdentifier.toUpperCase() };

    const order = await Order.findOne(filter);
    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    if (order.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to cancel this order.');
    }

    // Eligibility check
    const cancellableStatuses = ['PENDING', 'PLACED', 'CONFIRMED', 'PROCESSING'];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      throw new BadRequestError(
        `Order in state "${order.orderStatus}" cannot be cancelled. Only orders before dispatch are eligible for customer cancellation.`
      );
    }

    // Restore variant inventory if stock was deducted (i.e. order was CONFIRMED or PROCESSING)
    if (order.orderStatus === 'CONFIRMED' || order.orderStatus === 'PROCESSING') {
      for (const item of order.items) {
        const updated = await ProductVariant.findByIdAndUpdate(
          item.variantId,
          { $inc: { inventoryCount: item.quantity } },
          { new: true }
        );

        if (updated) {
          await InventoryLog.create({
            variantId: item.variantId,
            productId: item.productId,
            orderId: order._id,
            movementType: 'ORDER_CANCELLATION_RESTITUTION',
            quantityChanged: item.quantity,
            previousQuantity: updated.inventoryCount - item.quantity,
            newQuantity: updated.inventoryCount,
            performedBy: userId,
            reason: `Customer Cancellation: ${order.orderNumber}`
          });
        }
      }
    }

    let refundDetails = null;

    // If already paid via Razorpay, initiate refund
    if (order.paymentStatus === 'PAID') {
      const payment = await Payment.findOne({ orderId: order._id, status: 'CAPTURED' });
      if (payment) {
        const refundResponse = await razorpayService.processRefund({
          paymentId: payment.transactionId,
          amountPaise: order.financialBreakdown.grandTotalPaise,
          notes: {
            orderNumber: order.orderNumber,
            reason
          }
        });

        payment.status = 'REFUNDED';
        payment.refundDetails = {
          refundId: refundResponse.id,
          amountPaise: order.financialBreakdown.grandTotalPaise,
          refundedAt: new Date(),
          reason
        };
        await payment.save();

        refundDetails = {
          refundId: refundResponse.id,
          refundAmountPaise: order.financialBreakdown.grandTotalPaise
        };
      }

      order.paymentStatus = 'REFUNDED';
    }

    order.orderStatus = 'CANCELLED';
    order.cancellation = {
      reason,
      requestedAt: new Date(),
      processedAt: new Date(),
      refundId: refundDetails?.refundId || null,
      refundAmountPaise: refundDetails?.refundAmountPaise || 0
    };

    order.tracking.statusTimeline.push({
      status: 'CANCELLED',
      message: `Order cancelled by customer. Reason: ${reason}`,
      timestamp: new Date()
    });

    await order.save();

    // Customer notification & status email
    const customer = await User.findById(userId).select('name email');
    if (customer) {
      sendOrderStatusEmail({ to: customer.email, name: customer.name, order, newStatus: 'CANCELLED' }).catch(() => {});
    }

    await createPersistentNotification({
      userId,
      title: 'Order Cancelled',
      message: `Your order ${order.orderNumber} has been cancelled.${refundDetails ? ' A full refund has been initiated to your original payment method.' : ''}`,
      type: 'ORDER_UPDATE',
      linkUrl: `/account/orders/${order.orderNumber}`,
      idempotencyKey: `notif-order-cancel-${order._id}`
    });

    return {
      message: 'Order cancelled successfully.',
      order
    };
  }

  /**
   * Admin: Retrieves paginated orders across all customers with status and search filters.
   */
  async getAdminOrders({ page = 1, limit = 20, status, paymentStatus, search, startDate, endDate } = {}) {
    const filter = {};
    if (status && status !== 'ALL') filter.orderStatus = status;
    if (paymentStatus && paymentStatus !== 'ALL') filter.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      filter.placedAt = {};
      if (startDate) filter.placedAt.$gte = new Date(startDate);
      if (endDate) filter.placedAt.$lte = new Date(endDate);
    }

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { orderNumber: { $regex: escaped, $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: escaped, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: escaped, $options: 'i' } },
        { 'shippingAddress.city': { $regex: escaped, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('userId', 'firstName lastName email phone')
        .sort({ placedAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Admin: Updates order fulfillment status, assigns tracking details, and audits transitions.
   */
  async updateOrderStatus(adminUser, orderId, updateData, clientIp = '127.0.0.1') {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    const { status, message, courierName, trackingNumber, trackingUrl, estimatedDeliveryDate } = updateData;

    // Define permissible transitions
    const validTransitions = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      PLACED: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'DISPATCHED', 'CANCELLED'],
      SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED'],
      DISPATCHED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED'],
      OUT_FOR_DELIVERY: ['DELIVERED'],
      DELIVERED: ['RETURN_REQUESTED', 'REFUNDED'],
      CANCELLED: [],
      REFUNDED: [],
      RETURN_REQUESTED: ['RETURNED', 'REFUNDED'],
      RETURNED: ['REFUNDED']
    };

    const allowed = validTransitions[order.orderStatus] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestError(`Cannot transition order status from "${order.orderStatus}" to "${status}".`);
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = status;

    // If tracking details supplied
    if (courierName) order.tracking.courierName = courierName;
    if (trackingNumber) order.tracking.trackingNumber = trackingNumber;
    if (trackingUrl) order.tracking.trackingUrl = trackingUrl;
    if (estimatedDeliveryDate) order.tracking.estimatedDeliveryDate = new Date(estimatedDeliveryDate);

    // Append timeline entry
    order.tracking.statusTimeline.push({
      status,
      message: message || `Order status updated to ${status} by concierge administration.`,
      timestamp: new Date()
    });

    // If admin cancelled order, restore stock
    if (status === 'CANCELLED' && (previousStatus === 'CONFIRMED' || previousStatus === 'PROCESSING')) {
      for (const item of order.items) {
        await ProductVariant.findByIdAndUpdate(item.variantId, { $inc: { inventoryCount: item.quantity } });
      }
    }

    await order.save();

    // Create audit log
    await AuditLog.create({
      action: 'UPDATE_ORDER_STATUS',
      entity: 'Order',
      entityId: order._id,
      performedBy: adminUser._id,
      ipAddress: clientIp,
      changes: {
        before: { orderStatus: previousStatus },
        after: { orderStatus: status }
      },
      metadata: { orderNumber: order.orderNumber, reason: message }
    });

    // Customer notification & status email
    const customer = await User.findById(order.userId).select('name email');
    if (customer) {
      sendOrderStatusEmail({
        to: customer.email,
        name: customer.name,
        order,
        newStatus: status,
        trackingNumber,
        trackingUrl
      }).catch(() => {});
    }

    await createPersistentNotification({
      userId: order.userId,
      title: `Order Status Update: ${status}`,
      message: `Your order ${order.orderNumber} status is now ${status}.${trackingNumber ? ` Tracking Number: ${trackingNumber}` : ''}`,
      type: 'ORDER_UPDATE',
      linkUrl: `/account/orders/${order.orderNumber}`,
      idempotencyKey: `notif-order-status-${order._id}-${status}`
    });

    return order;
  }

  /**
   * Admin: Issues a refund on a paid order.
   */
  async refundOrder(adminUser, orderId, { amountPaise, reason }, clientIp = '127.0.0.1') {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    if (order.paymentStatus !== 'PAID') {
      throw new BadRequestError('Only paid orders can be refunded.');
    }

    const refundAmount =
      amountPaise !== undefined && amountPaise !== null
        ? Number(amountPaise)
        : order.financialBreakdown.grandTotalPaise;

    if (!refundAmount || refundAmount <= 0) {
      throw new BadRequestError('Refund amount must be a positive value greater than zero.');
    }

    if (refundAmount > order.financialBreakdown.grandTotalPaise) {
      throw new BadRequestError(
        `Refund amount (₹${(refundAmount / 100).toLocaleString('en-IN')}) cannot exceed the paid order grand total (₹${(order.financialBreakdown.grandTotalPaise / 100).toLocaleString('en-IN')}).`
      );
    }

    const payment = await Payment.findOne({ orderId: order._id, status: 'CAPTURED' });

    let refundResponse = null;
    if (payment && payment.gateway === 'RAZORPAY') {
      refundResponse = await razorpayService.processRefund({
        paymentId: payment.transactionId,
        amountPaise: refundAmount,
        notes: { orderNumber: order.orderNumber, reason }
      });

      payment.status = 'REFUNDED';
      payment.refundDetails = {
        refundId: refundResponse.id,
        amountPaise: refundAmount,
        refundedAt: new Date(),
        reason
      };
      await payment.save();
    }

    order.paymentStatus = 'REFUNDED';
    order.orderStatus = 'REFUNDED';
    order.cancellation = {
      reason,
      requestedAt: new Date(),
      processedAt: new Date(),
      refundId: refundResponse?.id || 'MANUAL_REFUND',
      refundAmountPaise: refundAmount
    };
    order.tracking.statusTimeline.push({
      status: 'REFUNDED',
      message: `Order refunded: ₹${(refundAmount / 100).toLocaleString('en-IN')}. Reason: ${reason}`,
      timestamp: new Date()
    });
    await order.save();

    await AuditLog.create({
      action: 'REFUND_ORDER',
      entity: 'Order',
      entityId: order._id,
      performedBy: adminUser._id,
      ipAddress: clientIp,
      changes: {
        before: { paymentStatus: 'PAID' },
        after: { paymentStatus: 'REFUNDED' }
      },
      metadata: { orderNumber: order.orderNumber, refundAmountPaise: refundAmount, reason }
    });

    return { message: 'Refund initiated successfully.', order };
  }
}

export const orderService = new OrderService();
