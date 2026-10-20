import express from 'express';
import * as pageContentController from '../controllers/pageContentController.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { pageKeyParamSchema, updatePageContentSchema } from '../validators/pageContentValidator.js';

const router = express.Router();

// Public: Get published page content
router.get(
  '/:pageKey',
  validateRequest({ params: pageKeyParamSchema }),
  pageContentController.getPageContent
);

// Admin: Get draft / unpublished page content for editing
router.get(
  '/admin/:pageKey',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN', 'STAFF'),
  validateRequest({ params: pageKeyParamSchema }),
  pageContentController.getAdminPageContent
);

// Admin: Update CMS page content
router.put(
  '/:pageKey',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN', 'STAFF'),
  validateRequest({ params: pageKeyParamSchema, body: updatePageContentSchema }),
  pageContentController.updatePageContent
);

export default router;
