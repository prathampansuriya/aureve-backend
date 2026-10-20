import * as analyticsService from '../services/analyticsService.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getOverview = asyncHandler(async (req, res) => {
  const result = await analyticsService.getOverviewMetrics(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Executive overview metrics retrieved successfully.',
    data: result
  });
});

export const getSalesTrend = asyncHandler(async (req, res) => {
  const result = await analyticsService.getSalesTrend(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Sales trend series retrieved successfully.',
    data: result
  });
});

export const getOrderStatusBreakdown = asyncHandler(async (req, res) => {
  const result = await analyticsService.getOrderStatusBreakdown(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Order status breakdown retrieved successfully.',
    data: result
  });
});

export const getTopProducts = asyncHandler(async (req, res) => {
  const result = await analyticsService.getTopProducts(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Top performing products retrieved successfully.',
    data: result
  });
});

export const getCategoryPerformance = asyncHandler(async (req, res) => {
  const result = await analyticsService.getCategoryPerformance(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Category performance retrieved successfully.',
    data: result
  });
});

export const getInventoryReport = asyncHandler(async (req, res) => {
  const result = await analyticsService.getInventoryReport(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Inventory report retrieved successfully.',
    data: result
  });
});

export const getCustomerGrowth = asyncHandler(async (req, res) => {
  const result = await analyticsService.getCustomerGrowthMetrics(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Customer growth metrics retrieved successfully.',
    data: result
  });
});

export const getCouponMetrics = asyncHandler(async (req, res) => {
  const result = await analyticsService.getCouponMetrics(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Coupon metrics retrieved successfully.',
    data: result
  });
});

export const getAppointmentMetrics = asyncHandler(async (req, res) => {
  const result = await analyticsService.getAppointmentMetrics(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Appointment metrics retrieved successfully.',
    data: result
  });
});

export const getReviewMetrics = asyncHandler(async (req, res) => {
  const result = await analyticsService.getReviewMetrics();
  return sendResponse(res, {
    statusCode: 200,
    message: 'Review moderation metrics retrieved successfully.',
    data: result
  });
});

export const getRefundMetrics = asyncHandler(async (req, res) => {
  const result = await analyticsService.getRefundMetrics(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Refund metrics retrieved successfully.',
    data: result
  });
});

export const analyticsController = {
  getOverview,
  getOverviewMetrics: getOverview,
  getSalesTrend,
  getOrderStatusBreakdown,
  getTopProducts,
  getCategoryPerformance,
  getInventoryReport,
  getCustomerGrowth,
  getCouponMetrics,
  getCouponPerformance: getCouponMetrics,
  getAppointmentMetrics,
  getAppointmentActivity: getAppointmentMetrics,
  getReviewMetrics,
  getReviewModerationQueue: getReviewMetrics,
  getRefundMetrics,
  getRefundTotals: getRefundMetrics
};

