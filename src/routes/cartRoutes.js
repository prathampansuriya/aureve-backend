import express from 'express';
import { z } from 'zod';
import { cartController } from '../controllers/cartController.js';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  addToCartSchema,
  updateCartItemSchema,
  applyCouponSchema,
  mergeCartSchema
} from '../validators/commerceValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const variantParamSchema = z.object({
  variantId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid variant ID.')
});

// Shopping Cart Endpoints (support both authenticated and guest shoppers)
router.get('/', optionalAuthenticate, asyncHandler(cartController.getCart));

router.post(
  '/items',
  optionalAuthenticate,
  validateRequest({ body: addToCartSchema }),
  asyncHandler(cartController.addItem)
);

router.put(
  '/items/:variantId',
  optionalAuthenticate,
  validateRequest({ params: variantParamSchema, body: updateCartItemSchema }),
  asyncHandler(cartController.updateItemQuantity)
);

router.delete(
  '/items/:variantId',
  optionalAuthenticate,
  validateRequest({ params: variantParamSchema }),
  asyncHandler(cartController.removeItem)
);

router.delete('/', optionalAuthenticate, asyncHandler(cartController.clearCart));

router.post(
  '/coupon',
  optionalAuthenticate,
  validateRequest({ body: applyCouponSchema }),
  asyncHandler(cartController.applyCoupon)
);

router.delete('/coupon', optionalAuthenticate, asyncHandler(cartController.removeCoupon));

// Guest Cart Merge (Requires authentication to attach to customer account)
router.post(
  '/merge',
  authenticate,
  validateRequest({ body: mergeCartSchema }),
  asyncHandler(cartController.mergeCart)
);

export default router;
