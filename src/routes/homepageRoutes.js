import express from 'express';
import { homepageController } from '../controllers/homepageController.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createBannerSchema,
  updateBannerSchema,
  bannerParamSchema,
  createSectionSchema,
  updateSectionSchema,
  sectionParamSchema
} from '../validators/homepageValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// ==========================================
// PUBLIC HOMEPAGE FEED
// ==========================================
router.get('/', asyncHandler(homepageController.getHomepage));

// ==========================================
// PROTECTED ADMINISTRATIVE CONTENT ROUTES
// ==========================================
router.use(authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'));

// Banner Management
router.get('/banners', asyncHandler(homepageController.getBanners));
router.post(
  '/banners',
  validateRequest({ body: createBannerSchema }),
  asyncHandler(homepageController.createBanner)
);
router.put(
  '/banners/:id',
  validateRequest({ params: bannerParamSchema, body: updateBannerSchema }),
  asyncHandler(homepageController.updateBanner)
);
router.delete(
  '/banners/:id',
  validateRequest({ params: bannerParamSchema }),
  asyncHandler(homepageController.deleteBanner)
);

// Merchandising Section Management
router.get('/sections', asyncHandler(homepageController.getSections));
router.post(
  '/sections',
  validateRequest({ body: createSectionSchema }),
  asyncHandler(homepageController.createSection)
);
router.put(
  '/sections/:id',
  validateRequest({ params: sectionParamSchema, body: updateSectionSchema }),
  asyncHandler(homepageController.updateSection)
);
router.delete(
  '/sections/:id',
  validateRequest({ params: sectionParamSchema }),
  asyncHandler(homepageController.deleteSection)
);

export default router;
