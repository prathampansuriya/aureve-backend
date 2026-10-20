import express from 'express';
import { z } from 'zod';
import { offerController } from '../controllers/offerController.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createOfferSchema,
  updateOfferSchema,
  commerceParamSchema
} from '../validators/commerceValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const idOrSlugParamSchema = z.object({
  idOrSlug: z.string().trim().min(1)
});

// Public Offer Endpoints
router.get('/active', asyncHandler(offerController.getActiveOffers));

router.get(
  '/:idOrSlug',
  validateRequest({ params: idOrSlugParamSchema }),
  asyncHandler(offerController.getOffer)
);

// Protected Admin Offer Endpoints
router.use(authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'));

router.post(
  '/',
  validateRequest({ body: createOfferSchema }),
  asyncHandler(offerController.createOffer)
);

router.get('/', asyncHandler(offerController.getOffers));

router.put(
  '/:id',
  validateRequest({ params: commerceParamSchema, body: updateOfferSchema }),
  asyncHandler(offerController.updateOffer)
);

router.delete(
  '/:id',
  validateRequest({ params: commerceParamSchema }),
  asyncHandler(offerController.deleteOffer)
);

export default router;
