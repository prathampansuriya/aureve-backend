import { orderService } from '../services/orderService.js';
import { razorpayService } from '../services/razorpayService.js';
import { Order } from '../models/Order.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found.');
  }

  if (order.userId.toString() !== req.user._id.toString()) {
    throw new ForbiddenError('You do not have permission to pay for this order.');
  }

  if (order.paymentStatus === 'PAID') {
    throw new BadRequestError('This order has already been paid for.');
  }

  // Create gateway order
  const gatewayOrder = await razorpayService.createGatewayOrder({
    amountPaise: order.financialBreakdown.grandTotalPaise,
    currency: 'INR',
    receipt: order.orderNumber,
    notes: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: req.user._id.toString()
    }
  });

  order.razorpayOrderId = gatewayOrder.id;
  await order.save();

  return sendResponse(res, {
    statusCode: 200,
    message: 'Razorpay order initialized.',
    data: {
      keyId: env.RAZORPAY_KEY_ID,
      orderId: gatewayOrder.id,
      amountPaise: order.financialBreakdown.grandTotalPaise,
      currency: 'INR',
      orderNumber: order.orderNumber
    }
  });
});

export const verifyPaymentSignature = asyncHandler(async (req, res) => {
  const result = await orderService.verifyPayment(req.user._id, req.body);
  return sendResponse(res, {
    statusCode: 200,
    message: result.message,
    data: { order: result.order, isIdempotent: result.isIdempotent }
  });
});

export const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody || req.body;

  const result = await orderService.handleRazorpayWebhook(rawBody, signature);
  return res.status(200).json(result);
});
