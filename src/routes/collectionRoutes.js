import express from 'express';
import { z } from 'zod';
import { collectionController } from '../controllers/collectionController.js';
import { authenticate, authorizeRoles, optionalAuthenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createCollectionSchema,
  updateCollectionSchema,
  collectionParamSchema,
  collectionQuerySchema,
  collectionProductAssociationSchema
} from '../validators/collectionValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const statusBodySchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED'])
});

// Public routes (with optional auth)
router.get(
  '/',
  optionalAuthenticate,
  validateRequest({ query: collectionQuerySchema }),
  asyncHandler(collectionController.getCollections)
);

router.get(
  '/:idOrSlug',
  optionalAuthenticate,
  validateRequest({ params: collectionParamSchema }),
  asyncHandler(collectionController.getCollection)
);

router.get(
  '/:idOrSlug/products',
  optionalAuthenticate,
  validateRequest({ params: collectionParamSchema }),
  asyncHandler(collectionController.getCollectionProducts)
);

// Protected Admin routes
router.use(authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'));

router.post(
  '/',
  validateRequest({ body: createCollectionSchema }),
  asyncHandler(collectionController.createCollection)
);

router.put(
  '/:idOrSlug',
  validateRequest({ params: collectionParamSchema, body: updateCollectionSchema }),
  asyncHandler(collectionController.updateCollection)
);

router.patch(
  '/:idOrSlug/status',
  validateRequest({ params: collectionParamSchema, body: statusBodySchema }),
  asyncHandler(collectionController.setStatus)
);

router.delete(
  '/:idOrSlug',
  validateRequest({ params: collectionParamSchema }),
  asyncHandler(collectionController.deleteCollection)
);

router.post(
  '/:idOrSlug/products',
  validateRequest({ params: collectionParamSchema, body: collectionProductAssociationSchema }),
  asyncHandler(collectionController.addProducts)
);

router.delete(
  '/:idOrSlug/products',
  validateRequest({ params: collectionParamSchema, body: collectionProductAssociationSchema }),
  asyncHandler(collectionController.removeProducts)
);

export default router;
