import * as notificationService from '../services/notificationService.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMyNotifications = asyncHandler(async (req, res) => {
  const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;
  const result = await notificationService.getUserNotifications(req.user._id, {
    isRead,
    page: req.query.page,
    limit: req.query.limit
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Notifications retrieved successfully.',
    data: result
  });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadNotificationCount(req.user._id);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Unread notification count retrieved.',
    data: result
  });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markNotificationAsRead(req.params.id, req.user._id);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Notification marked as read.',
    data: { notification }
  });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllNotificationsAsRead(req.user._id);
  return sendResponse(res, {
    statusCode: 200,
    message: 'All notifications marked as read.',
    data: result
  });
});

export const getAdminNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getAdminNotifications(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Admin notifications retrieved successfully.',
    data: result
  });
});

export const retryNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.retryNotificationDelivery(req.params.id);
  return sendResponse(res, {
    statusCode: 200,
    message: result.message,
    data: result
  });
});
