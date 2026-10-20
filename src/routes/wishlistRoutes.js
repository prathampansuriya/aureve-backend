import express from 'express';
import { z } from 'zod';
import { wishlistController } from '../controllers/wishlistController.js';
import { authenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { addToWishlistSchema, moveToCartSchema } from '../validators/commerceValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const productParamSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID.')
});

// All Wishlist operations require customer authentication
router.use(authenticate);

router.get('/', asyncHandler(wishlistController.getWishlist));

router.post(
  '/',
  validateRequest({ body: addToWishlistSchema }),
  asyncHandler(wishlistController.addItem)
);

router.delete(
  '/:productId',
  validateRequest({ params: productParamSchema }),
  asyncHandler(wishlistController.removeItem)
);

router.post(
  '/move-to-cart',
  validateRequest({ body: moveToCartSchema }),
  asyncHandler(wishlistController.moveToCart)
);

export default router;
