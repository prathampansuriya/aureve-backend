import express from 'express';
import { analyticsController } from '../controllers/analyticsController.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

// All analytics endpoints require authentication
router.use(authenticate);

// 1. Executive Overview Metrics (Admin + Super Admin)
router.get('/overview', authorizeRoles('ADMIN', 'SUPER_ADMIN'), analyticsController.getOverviewMetrics);

// 2. Sales and Revenue Trends (Admin + Super Admin)
router.get('/sales-trend', authorizeRoles('ADMIN', 'SUPER_ADMIN'), analyticsController.getSalesTrend);

// 3. Order Status Breakdown (Admin + Super Admin)
router.get('/order-status', authorizeRoles('ADMIN', 'SUPER_ADMIN'), analyticsController.getOrderStatusBreakdown);

// 4. Product Performance & Top Sellers (Admin + Super Admin)
router.get('/top-products', authorizeRoles('ADMIN', 'SUPER_ADMIN'), analyticsController.getTopProducts);

// 5. Category Performance Breakdown (Admin + Super Admin)
router.get('/categories', authorizeRoles('ADMIN', 'SUPER_ADMIN'), analyticsController.getCategoryPerformance);

// 6. Inventory Valuation & Low Stock Report (Admin + Super Admin)
router.get('/inventory', authorizeRoles('ADMIN', 'SUPER_ADMIN'), analyticsController.getInventoryReport);

// 7. Customer Acquisition & Growth (Admin + Super Admin)
router.get('/customers', authorizeRoles('ADMIN', 'SUPER_ADMIN'), analyticsController.getCustomerGrowth);

// 8. Coupon Performance & Discount Totals (Admin + Super Admin)
router.get('/coupons', authorizeRoles('ADMIN', 'SUPER_ADMIN'), analyticsController.getCouponPerformance);

// 9. Refund Totals & Financial Loss (Admin + Super Admin)
router.get('/refunds', authorizeRoles('ADMIN', 'SUPER_ADMIN'), analyticsController.getRefundTotals);

// 10. Appointment Activity & Store Performance (Staff + Admin + Super Admin)
router.get('/appointments', authorizeRoles('STAFF', 'ADMIN', 'SUPER_ADMIN'), analyticsController.getAppointmentActivity);

// 11. Review Moderation Queue & Customer Satisfaction (Staff + Admin + Super Admin)
router.get('/reviews', authorizeRoles('STAFF', 'ADMIN', 'SUPER_ADMIN'), analyticsController.getReviewModerationQueue);

export default router;
