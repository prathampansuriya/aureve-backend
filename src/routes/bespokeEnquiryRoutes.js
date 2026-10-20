import express from 'express';
import * as bespokeEnquiryController from '../controllers/bespokeEnquiryController.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createBespokeEnquirySchema,
  updateBespokeEnquirySchema,
  enquiryQuerySchema
} from '../validators/bespokeEnquiryValidator.js';

const router = express.Router();

// Public: Submit a bespoke commission enquiry
router.post(
  '/',
  validateRequest({ body: createBespokeEnquirySchema }),
  bespokeEnquiryController.createEnquiry
);

// Admin dedicated router (/api/v1/admin/enquiries/bespoke)
export const adminBespokeEnquiryRouter = express.Router();
adminBespokeEnquiryRouter.use(authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'STAFF'));

adminBespokeEnquiryRouter.get(
  '/',
  validateRequest({ query: enquiryQuerySchema }),
  bespokeEnquiryController.listEnquiries
);

adminBespokeEnquiryRouter.get('/:id', bespokeEnquiryController.getEnquiryById);

adminBespokeEnquiryRouter.patch(
  '/:id',
  validateRequest({ body: updateBespokeEnquirySchema }),
  bespokeEnquiryController.updateEnquiry
);

export default router;
