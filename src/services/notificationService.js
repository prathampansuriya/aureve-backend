import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { sendTransactionalEmail } from './emailService.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * Creates a persistent customer notification and optionally dispatches an idempotent email.
 */
export const createPersistentNotification = async ({
  userId,
  title,
  message,
  type,
  linkUrl = '',
  idempotencyKey = null,
  metadata = {},
  sendEmail = false,
  emailSubject = '',
  emailHtml = ''
}) => {
  // Idempotency check: prevent duplicate notifications and emails for identical event triggers
  if (idempotencyKey) {
    const existing = await Notification.findOne({ userId, idempotencyKey });
    if (existing) {
      logger.info(`[NOTIFICATION IDEMPOTENCY] Notification already recorded for key ${idempotencyKey} (User: ${userId})`);
      return existing;
    }
  }

  const notification = new Notification({
    userId,
    title,
    message,
    type,
    linkUrl,
    idempotencyKey,
    metadata
  });

  if (sendEmail) {
    const user = await User.findById(userId).select('name email');
    if (user?.email) {
      notification.emailSent = true;
      try {
        const emailResult = await sendTransactionalEmail({
          to: user.email,
          subject: emailSubject || title,
          title,
          preheader: message,
          contentHtml: emailHtml || `<p>${message}</p>`
        });
        notification.emailDelivered = Boolean(emailResult?.delivered);
        notification.emailError = emailResult?.reason || null;
      } catch (err) {
        notification.emailDelivered = false;
        notification.emailError = err.message;
        logger.error(`[NOTIFICATION EMAIL ERROR] Failed to send email to ${user.email}: ${err.message}`);
      }
    }
  }

  await notification.save();
  return notification;
};

/**
 * Retrieves paginated notifications for an authenticated customer.
 */
export const getUserNotifications = async (userId, { isRead, page = 1, limit = 20 } = {}) => {
  const query = { userId };
  if (typeof isRead === 'boolean') {
    query.isRead = isRead;
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [notifications, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(numericLimit).lean(),
    Notification.countDocuments(query)
  ]);

  return {
    notifications,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit) || 1
    }
  };
};

/**
 * Marks a specific notification as read.
 */
export const markNotificationAsRead = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new NotFoundError('Notification not found.');
  }

  if (notification.userId.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to access this notification.');
  }

  notification.isRead = true;
  await notification.save();
  return notification;
};

/**
 * Marks all notifications as read for a customer.
 */
export const markAllNotificationsAsRead = async (userId) => {
  const result = await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
  return { modifiedCount: result.modifiedCount };
};

/**
 * Returns count of unread notifications for a customer.
 */
export const getUnreadNotificationCount = async (userId) => {
  const count = await Notification.countDocuments({ userId, isRead: false });
  return { unreadCount: count };
};

/**
 * Retrieves paginated notifications across all patrons for administrative inspection.
 */
export const getAdminNotifications = async ({ page = 1, limit = 20, type, status, search } = {}) => {
  const query = {};

  if (type && type !== 'ALL') {
    query.type = type;
  }

  if (status === 'DELIVERED') {
    query.emailDelivered = true;
  } else if (status === 'FAILED') {
    query.emailSent = true;
    query.emailDelivered = false;
  } else if (status === 'IN_APP_ONLY') {
    query.emailSent = false;
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  let userIds = null;
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matchedUsers = await User.find({
      $or: [
        { firstName: { $regex: escaped, $options: 'i' } },
        { lastName: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } }
      ]
    }).select('_id');
    userIds = matchedUsers.map((u) => u._id);

    query.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { message: { $regex: escaped, $options: 'i' } },
      { userId: { $in: userIds } }
    ];
  }

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .populate('userId', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    Notification.countDocuments(query)
  ]);

  return {
    notifications,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit) || 1
    }
  };
};

/**
 * Retries delivery for a failed transactional email notification.
 */
export const retryNotificationDelivery = async (notificationId) => {
  const notification = await Notification.findById(notificationId).populate('userId', 'firstName lastName email');
  if (!notification) {
    throw new NotFoundError('Notification not found.');
  }

  const user = notification.userId;
  if (!user?.email) {
    throw new BadRequestError('Recipient customer email not found.');
  }

  try {
    const emailResult = await sendTransactionalEmail({
      to: user.email,
      subject: notification.title,
      title: notification.title,
      preheader: notification.message,
      contentHtml: `<p>${notification.message}</p>`
    });

    notification.emailSent = true;
    notification.emailDelivered = Boolean(emailResult?.delivered);
    notification.emailError = emailResult?.reason || null;
    await notification.save();

    return {
      success: notification.emailDelivered,
      message: notification.emailDelivered
        ? 'Notification email re-dispatched and delivered successfully.'
        : `Email dispatched but marked unconfirmed: ${notification.emailError}`,
      notification
    };
  } catch (err) {
    notification.emailSent = true;
    notification.emailDelivered = false;
    notification.emailError = err.message;
    await notification.save();

    return {
      success: false,
      message: `Retry dispatch failed: ${err.message}`,
      notification
    };
  }
};
