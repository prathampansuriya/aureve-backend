import express from 'express';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { objectIdParamSchema } from '../utils/queryHelper.js';
import {
  checkoutSummarySchema,
  createOrderSchema,
  cancelOrderSchema,
  updateOrderStatusSchema,
  adminRefundSchema
} from '../validators/orderValidator.js';
import * as orderController from '../controllers/orderController.js';

const router = express.Router();

// Customer checkout summary & order creation
router.get(
  '/checkout-summary',
  authenticate,
  validateRequest({ query: checkoutSummarySchema }),
  orderController.getCheckoutSummary
);

router.post(
  '/',
  authenticate,
  validateRequest({ body: createOrderSchema }),
  orderController.createOrder
);

// Explicit alias for COD order creation
router.post(
  '/cod',
  authenticate,
  (req, res, next) => {
    req.body.paymentMethod = 'COD';
    next();
  },
  validateRequest({ body: createOrderSchema }),
  orderController.createOrder
);

// Customer order listing
router.get('/', authenticate, orderController.getCustomerOrders);

// Admin order routes under /orders/admin
router.get(
  '/admin/all',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  orderController.getAdminOrders
);

router.patch(
  '/admin/:id/status',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validateRequest({ params: objectIdParamSchema, body: updateOrderStatusSchema }),
  orderController.updateOrderStatus
);

router.post(
  '/admin/:id/refund',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validateRequest({ params: objectIdParamSchema, body: adminRefundSchema }),
  orderController.refundOrder
);

// Customer single order details and cancellation
router.get('/:orderNumber', authenticate, orderController.getOrderDetails);

router.post(
  '/:orderNumber/cancel',
  authenticate,
  validateRequest({ body: cancelOrderSchema }),
  orderController.cancelOrder
);

// Standalone dedicated Admin Router for mounting at /api/v1/admin/orders
export const adminOrderRouter = express.Router();
adminOrderRouter.use(authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'));

adminOrderRouter.get('/', orderController.getAdminOrders);
adminOrderRouter.get('/:orderNumber', orderController.getOrderDetails);
adminOrderRouter.patch(
  '/:id/status',
  validateRequest({ params: objectIdParamSchema, body: updateOrderStatusSchema }),
  orderController.updateOrderStatus
);
adminOrderRouter.post(
  '/:id/refund',
  validateRequest({ params: objectIdParamSchema, body: adminRefundSchema }),
  orderController.refundOrder
);

export default router;
