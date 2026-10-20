import express from 'express';
import { couponController } from '../controllers/couponController.js';
import { authenticate, authorizeRoles, optionalAuthenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  commerceParamSchema
} from '../validators/commerceValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Validation probe endpoint (Public/Authenticated)
router.post(
  '/validate',
  optionalAuthenticate,
  validateRequest({ body: validateCouponSchema }),
  asyncHandler(couponController.validateCoupon)
);

// Active Storefront Coupons for Patrons and Checkout (Public/Authenticated)
router.get('/available', optionalAuthenticate, asyncHandler(couponController.getAvailableCoupons));

// Protected Admin Management Endpoints
router.use(authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'));

router.post(
  '/',
  validateRequest({ body: createCouponSchema }),
  asyncHandler(couponController.createCoupon)
);

router.get('/', asyncHandler(couponController.getCoupons));

router.get(
  '/:id',
  validateRequest({ params: commerceParamSchema }),
  asyncHandler(couponController.getCoupon)
);

router.put(
  '/:id',
  validateRequest({ params: commerceParamSchema, body: updateCouponSchema }),
  asyncHandler(couponController.updateCoupon)
);

router.delete(
  '/:id',
  validateRequest({ params: commerceParamSchema }),
  asyncHandler(couponController.deleteCoupon)
);

export default router;
