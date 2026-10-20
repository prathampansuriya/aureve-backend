import express from 'express';
import { z } from 'zod';
import { productController } from '../controllers/productController.js';
import { authenticate, authorizeRoles, optionalAuthenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createProductSchema,
  updateProductSchema,
  updateMediaSchema,
  productParamSchema,
  createVariantSchema,
  updateVariantSchema,
  stockAdjustmentSchema,
  stockReservationSchema,
  catalogQuerySchema
} from '../validators/productValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const variantParamSchema = z.object({
  variantId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid variant ID.')
});

// ==========================================
// PUBLIC CATALOG DISCOVERY ROUTES
// ==========================================

// 1. Full-faceted catalog search & filter
router.get(
  '/',
  optionalAuthenticate,
  validateRequest({ query: catalogQuerySchema }),
  asyncHandler(productController.getCatalog)
);

// 2. Real-data driven bestsellers
router.get(
  '/bestsellers',
  optionalAuthenticate,
  asyncHandler(productController.getBestsellers)
);

// 3. New arrivals collection
router.get(
  '/new-arrivals',
  optionalAuthenticate,
  asyncHandler(productController.getNewArrivals)
);

// 4. Real engagement-driven trending jewellery
router.get(
  '/trending',
  optionalAuthenticate,
  asyncHandler(productController.getTrending)
);

// 5. Telemetric product view recording
router.post(
  '/:idOrSlug/view',
  optionalAuthenticate,
  validateRequest({ params: productParamSchema }),
  asyncHandler(productController.trackProductView)
);

// 6. Product details
router.get(
  '/:idOrSlug',
  optionalAuthenticate,
  validateRequest({ params: productParamSchema }),
  asyncHandler(productController.getProduct)
);

// 5. Related products
router.get(
  '/:idOrSlug/related',
  optionalAuthenticate,
  validateRequest({ params: productParamSchema }),
  asyncHandler(productController.getRelatedProducts)
);

// ==========================================
// CHECKOUT STOCK RESERVATION / RELEASE (Authenticated)
// ==========================================

router.post(
  '/variants/:variantId/stock/reserve',
  authenticate,
  validateRequest({ params: variantParamSchema, body: stockReservationSchema }),
  asyncHandler(productController.reserveStock)
);

router.post(
  '/variants/:variantId/stock/release',
  authenticate,
  validateRequest({ params: variantParamSchema, body: stockReservationSchema }),
  asyncHandler(productController.releaseStock)
);

// ==========================================
// PROTECTED ADMINISTRATIVE CATALOG ROUTES
// ==========================================

router.use(authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'));

// Create master product
router.post(
  '/',
  validateRequest({ body: createProductSchema }),
  asyncHandler(productController.createProduct)
);

// Update master product
router.put(
  '/:idOrSlug',
  validateRequest({ params: productParamSchema, body: updateProductSchema }),
  asyncHandler(productController.updateProduct)
);

// Delete master product
router.delete(
  '/:idOrSlug',
  validateRequest({ params: productParamSchema }),
  asyncHandler(productController.deleteProduct)
);

// Update rich media gallery & videos
router.put(
  '/:idOrSlug/media',
  validateRequest({ params: productParamSchema, body: updateMediaSchema }),
  asyncHandler(productController.updateMedia)
);

// Create variant
router.post(
  '/:idOrSlug/variants',
  validateRequest({ params: productParamSchema, body: createVariantSchema }),
  asyncHandler(productController.createVariant)
);

// Update variant
router.put(
  '/variants/:variantId',
  validateRequest({ params: variantParamSchema, body: updateVariantSchema }),
  asyncHandler(productController.updateVariant)
);

// Delete variant
router.delete(
  '/variants/:variantId',
  validateRequest({ params: variantParamSchema }),
  asyncHandler(productController.deleteVariant)
);

// Audit-logged stock adjustment
router.post(
  '/variants/:variantId/stock/adjust',
  validateRequest({ params: variantParamSchema, body: stockAdjustmentSchema }),
  asyncHandler(productController.adjustStock)
);

export default router;
