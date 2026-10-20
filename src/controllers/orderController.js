import { orderService } from '../services/orderService.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getCheckoutSummary = asyncHandler(async (req, res) => {
  const summary = await orderService.getCheckoutSummary(req.user._id, req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Checkout summary generated.',
    data: summary
  });
});

export const createOrder = asyncHandler(async (req, res) => {
  // Support idempotency key via body or x-idempotency-key header
  const idempotencyKey = req.body.idempotencyKey || req.headers['x-idempotency-key'];
  const orderData = { ...req.body, idempotencyKey };

  const result = await orderService.createOrder(req.user._id, orderData, req.ip);
  return sendResponse(res, {
    statusCode: result.isDuplicate ? 200 : 201,
    message: result.isDuplicate ? 'Order already placed.' : 'Order placed successfully.',
    data: result
  });
});

export const getCustomerOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const status = req.query.status;

  const result = await orderService.getCustomerOrders(req.user._id, { page, limit, status });
  return sendResponse(res, {
    statusCode: 200,
    message: 'Order history retrieved.',
    data: result
  });
});

export const getOrderDetails = asyncHandler(async (req, res) => {
  const result = await orderService.getOrderDetails(req.user, req.params.orderNumber);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Order details retrieved.',
    data: result
  });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const result = await orderService.cancelOrder(req.user._id, req.params.orderNumber, req.body);
  return sendResponse(res, {
    statusCode: 200,
    message: result.message,
    data: result.order
  });
});

// Admin Controllers
export const getAdminOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const { status, paymentStatus, search, startDate, endDate } = req.query;

  const result = await orderService.getAdminOrders({ page, limit, status, paymentStatus, search, startDate, endDate });
  return sendResponse(res, {
    statusCode: 200,
    message: 'Admin orders retrieved.',
    data: result
  });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const updatedOrder = await orderService.updateOrderStatus(req.user, req.params.id, req.body, req.ip);
  return sendResponse(res, {
    statusCode: 200,
    message: `Order status updated to ${updatedOrder.orderStatus}.`,
    data: { order: updatedOrder }
  });
});

export const refundOrder = asyncHandler(async (req, res) => {
  const result = await orderService.refundOrder(req.user, req.params.id, req.body, req.ip);
  return sendResponse(res, {
    statusCode: 200,
    message: result.message,
    data: { order: result.order }
  });
});
