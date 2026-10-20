import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', notificationController.getMyNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);

// Administrative Notification Queue (/api/v1/admin/notifications)
export const adminNotificationRouter = express.Router();
adminNotificationRouter.use(authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'));
adminNotificationRouter.get('/', notificationController.getAdminNotifications);
adminNotificationRouter.post('/retry/:id', notificationController.retryNotification);

export default router;
