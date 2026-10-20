import express from 'express';
import * as contactInquiryController from '../controllers/contactInquiryController.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createContactInquirySchema,
  updateContactInquirySchema,
  contactInquiryQuerySchema
} from '../validators/contactInquiryValidator.js';

const router = express.Router();

// Public: Submit a concierge contact inquiry
router.post(
  '/',
  validateRequest({ body: createContactInquirySchema }),
  contactInquiryController.createInquiry
);

// Admin router (/api/v1/admin/contact-inquiries)
export const adminContactInquiryRouter = express.Router();
adminContactInquiryRouter.use(authenticate, authorizeRoles('STAFF', 'ADMIN', 'SUPER_ADMIN'));

adminContactInquiryRouter.get(
  '/',
  validateRequest({ query: contactInquiryQuerySchema }),
  contactInquiryController.listInquiries
);

adminContactInquiryRouter.get('/:id', contactInquiryController.getInquiryById);

adminContactInquiryRouter.patch(
  '/:id',
  validateRequest({ body: updateContactInquirySchema }),
  contactInquiryController.updateInquiry
);

adminContactInquiryRouter.delete(
  '/:id',
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  contactInquiryController.deleteInquiry
);

export default router;
