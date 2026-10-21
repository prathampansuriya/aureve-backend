import express from 'express';
import { z } from 'zod';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import mediaRoutes from './mediaRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import collectionRoutes from './collectionRoutes.js';
import productRoutes from './productRoutes.js';
import homepageRoutes from './homepageRoutes.js';
import wishlistRoutes from './wishlistRoutes.js';
import cartRoutes from './cartRoutes.js';
import couponRoutes from './couponRoutes.js';
import offerRoutes from './offerRoutes.js';
import addressRoutes from './addressRoutes.js';
import orderRoutes, { adminOrderRouter } from './orderRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import storeLocationRoutes, { adminStoreRouter } from './storeLocationRoutes.js';
import appointmentRoutes, { adminAppointmentRouter } from './appointmentRoutes.js';
import reviewRoutes, { adminReviewRouter } from './reviewRoutes.js';
import notificationRoutes, { adminNotificationRouter } from './notificationRoutes.js';
import adminUserRoutes from './adminUserRoutes.js';
import auditLogRoutes from './auditLogRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import reportExportRoutes from './reportExportRoutes.js';
import newsletterRoutes from './newsletterRoutes.js';
import pageContentRoutes from './pageContentRoutes.js';
import bespokeEnquiryRoutes, { adminBespokeEnquiryRouter } from './bespokeEnquiryRoutes.js';
import contactInquiryRoutes, { adminContactInquiryRouter } from './contactInquiryRoutes.js';
import { authenticate, authorizeRoles, preventRoleEscalation } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { paginationQuerySchema } from '../utils/queryHelper.js';

const apiRouter = express.Router();

// Mount Health and Readiness probes
apiRouter.use('/health', healthRoutes);

// Mount Authentication & Session Routes
apiRouter.use('/auth', authRoutes);

// Mount Media Upload & Asset Management Routes
apiRouter.use('/media', mediaRoutes);

// Mount Catalog & Merchandising Routes
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/collections', collectionRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/homepage', homepageRoutes);

// Mount Commerce, Shopping State & Promotion Routes
apiRouter.use('/wishlist', wishlistRoutes);
apiRouter.use('/cart', cartRoutes);
apiRouter.use('/coupons', couponRoutes);
apiRouter.use('/offers', offerRoutes);
apiRouter.use('/admin/offers', offerRoutes);
apiRouter.use('/newsletter', newsletterRoutes);

// Mount Customer Address Book Routes
apiRouter.use('/addresses', addressRoutes);

// Mount Order & Checkout Routes
apiRouter.use('/orders', orderRoutes);

// Mount Admin Orders Management Routes (/api/v1/admin/orders)
apiRouter.use('/admin/orders', adminOrderRouter);

// Mount Payment Gateway Routes (/api/v1/payments)
apiRouter.use('/payments', paymentRoutes);

// Mount Showroom Store Locations Routes (/api/v1/stores & /api/v1/admin/stores)
apiRouter.use('/stores', storeLocationRoutes);
apiRouter.use('/admin/stores', adminStoreRouter);

// Mount VIP Appointment Consultation Routes (/api/v1/appointments & /api/v1/admin/appointments)
apiRouter.use('/appointments', appointmentRoutes);
apiRouter.use('/admin/appointments', adminAppointmentRouter);

// Mount Customer Reviews & Moderation Routes (/api/v1/reviews & /api/v1/admin/reviews)
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/admin/reviews', adminReviewRouter);

// Mount Customer Persistent Notifications Routes (/api/v1/notifications)
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/admin/notifications', adminNotificationRouter);

// Mount Administrative Management & RBAC Routes (/api/v1/admin/users)
apiRouter.use('/admin/users', adminUserRoutes);

// Mount Administrative Audit Log Inspection Routes (/api/v1/admin/audit-logs)
apiRouter.use('/admin/audit-logs', auditLogRoutes);

// Mount Executive Analytics & Operational Queues Routes (/api/v1/admin/analytics)
apiRouter.use('/admin/analytics', analyticsRoutes);

// Mount Bounded CSV Report Export Routes (/api/v1/admin/reports)
apiRouter.use('/admin/reports', reportExportRoutes);

// Mount CMS Page Content Routes (/api/v1/content/pages)
apiRouter.use('/content/pages', pageContentRoutes);

// Mount Bespoke Commission Enquiry Routes (/api/v1/enquiries/bespoke & /api/v1/admin/enquiries/bespoke)
apiRouter.use('/enquiries/bespoke', bespokeEnquiryRoutes);
apiRouter.use('/admin/enquiries/bespoke', adminBespokeEnquiryRouter);

// Mount Patron Contact Inquiries Routes (/api/v1/contact & /api/v1/admin/contact-inquiries)
apiRouter.use('/contact', contactInquiryRoutes);
apiRouter.use('/admin/contact-inquiries', adminContactInquiryRouter);

// Infrastructure Verification Routes (used to test security, validation, and auth primitives)
const testRouter = express.Router();

// 1. Validation test route (validates body with strict mass-assignment prevention and query pagination)
const testBodySchema = z.object({
  name: z.string().min(2, 'Name must have at least 2 characters.'),
  email: z.string().email('Invalid email address.')
}).strict(); // Rejects unknown keys to test mass-assignment protection

testRouter.post(
  '/validation',
  validateRequest({
    body: testBodySchema,
    query: paginationQuerySchema
  }),
  (req, res) => {
    sendResponse(res, {
      message: 'Validation test passed successfully.',
      data: { body: req.body, query: req.query }
    });
  }
);

// 2. Authentication test route (requires valid JWT access token)
testRouter.get(
  '/protected',
  authenticate,
  (req, res) => {
    sendResponse(res, {
      message: 'Authenticated successfully.',
      data: { user: { id: req.user._id, email: req.user.email, role: req.user.role } }
    });
  }
);

// 3. RBAC Admin test route (strictly requires ADMIN or SUPER_ADMIN role)
testRouter.get(
  '/admin-only',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  (req, res) => {
    sendResponse(res, {
      message: 'Admin access authorized.',
      data: { authorizedRole: req.user.role }
    });
  }
);

// 4. Role Escalation test route (tests rejection of elevated role submissions during registration)
testRouter.post(
  '/register-check',
  preventRoleEscalation,
  (req, res) => {
    sendResponse(res, {
      message: 'Registration role check passed.',
      data: { assignedRole: req.body.role }
    });
  }
);

// 5. Async Error Propagation test route
testRouter.get(
  '/async-error',
  asyncHandler(async () => {
    throw new Error('Simulated async controller failure.');
  })
);

apiRouter.use('/test', testRouter);

export default apiRouter;
