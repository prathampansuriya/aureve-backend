import express from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { createReviewSchema, moderateReviewSchema } from '../validators/reviewValidator.js';

const router = express.Router();

// Public: Product Approved Reviews (/api/v1/reviews)
router.get('/product/:productId', reviewController.getProductReviews);

// Authenticated Customer: Submit Review & Helpful Votes
router.post(
  '/',
  authenticate,
  validateRequest({ body: createReviewSchema }),
  reviewController.createReview
);

router.patch('/:id/vote', authenticate, reviewController.voteHelpful);

// Admin / Staff Moderation Queue (/api/v1/admin/reviews)
export const adminReviewRouter = express.Router();
adminReviewRouter.use(authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'STAFF'));

adminReviewRouter.get('/', reviewController.adminListReviews);
adminReviewRouter.patch(
  '/:id/moderate',
  validateRequest({ body: moderateReviewSchema }),
  reviewController.adminModerateReview
);

export default router;
