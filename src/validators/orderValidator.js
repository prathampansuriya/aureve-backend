import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const checkoutSummarySchema = z.object({
  shippingAddressId: z.string().regex(objectIdRegex, 'Invalid shipping address ID.').optional(),
  billingAddressId: z.string().regex(objectIdRegex, 'Invalid billing address ID.').optional(),
  couponCode: z.string().trim().max(50).optional()
});

export const createOrderSchema = z.object({
  shippingAddressId: z.string().regex(objectIdRegex, 'Valid shipping address ID is required.'),
  billingAddressId: z.string().regex(objectIdRegex, 'Invalid billing address ID.').optional(),
  paymentMethod: z.enum(['RAZORPAY', 'COD'], {
    required_error: 'Payment method is required (RAZORPAY or COD).'
  }),
  idempotencyKey: z.string().trim().max(100).optional(),
  couponCode: z.string().trim().max(50).optional(),
  giftDetails: z
    .object({
      isGift: z.boolean().default(false),
      recipientName: z.string().trim().max(100).optional().default(''),
      message: z.string().trim().max(300).optional().default('')
    })
    .optional()
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'razorpay_order_id is required.'),
  razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required.'),
  razorpay_signature: z.string().min(1, 'razorpay_signature is required.')
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3, 'Cancellation reason must be at least 3 characters.').max(500)
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DISPATCHED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED'
  ]),
  message: z.string().trim().max(300).optional(),
  courierName: z.string().trim().max(100).optional(),
  trackingNumber: z.string().trim().max(100).optional(),
  trackingUrl: z.string().trim().url('Invalid tracking URL format.').optional().or(z.literal('')),
  estimatedDeliveryDate: z.string().datetime().optional().or(z.literal(''))
});

export const adminRefundSchema = z.object({
  amountPaise: z.number().int().positive().optional(),
  reason: z.string().trim().min(3).max(300).optional().default('Administrative refund')
});
