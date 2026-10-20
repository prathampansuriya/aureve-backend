import express from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { authenticate, authorizeRoles, optionalAuthenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryParamSchema,
  categoryQuerySchema
} from '../validators/categoryValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Public routes (with optional auth so admins can view archived items)
router.get(
  '/',
  optionalAuthenticate,
  validateRequest({ query: categoryQuerySchema }),
  asyncHandler(categoryController.getCategories)
);

router.get(
  '/:idOrSlug',
  optionalAuthenticate,
  validateRequest({ params: categoryParamSchema }),
  asyncHandler(categoryController.getCategory)
);

// Protected Admin routes
router.use(authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'));

router.post(
  '/',
  validateRequest({ body: createCategorySchema }),
  asyncHandler(categoryController.createCategory)
);

router.put(
  '/:idOrSlug',
  validateRequest({ params: categoryParamSchema, body: updateCategorySchema }),
  asyncHandler(categoryController.updateCategory)
);

router.patch(
  '/:idOrSlug/archive',
  validateRequest({ params: categoryParamSchema }),
  asyncHandler(categoryController.archiveCategory)
);

router.patch(
  '/:idOrSlug/restore',
  validateRequest({ params: categoryParamSchema }),
  asyncHandler(categoryController.restoreCategory)
);

router.delete(
  '/:idOrSlug',
  validateRequest({ params: categoryParamSchema }),
  asyncHandler(categoryController.deleteCategory)
);

export default router;
