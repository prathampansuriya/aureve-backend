import express from 'express';
import * as appointmentController from '../controllers/appointmentController.js';
import { authenticate, optionalAuthenticate, authorizeRoles } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  availabilityQuerySchema,
  bookAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  adminUpdateAppointmentSchema,
  adminBlockSlotSchema
} from '../validators/appointmentValidator.js';

const router = express.Router();

// Public / Guest Availability & Booking (/api/v1/appointments)
router.get(
  '/availability',
  validateRequest({ query: availabilityQuerySchema }),
  appointmentController.getAvailability
);

router.post(
  '/book',
  optionalAuthenticate,
  validateRequest({ body: bookAppointmentSchema }),
  appointmentController.bookAppointment
);

// Authenticated Customer Management
router.get('/my-bookings', authenticate, appointmentController.getCustomerAppointments);
router.get('/:id', authenticate, appointmentController.getAppointmentById);
router.patch(
  '/:id/reschedule',
  authenticate,
  validateRequest({ body: rescheduleAppointmentSchema }),
  appointmentController.rescheduleAppointment
);
router.patch(
  '/:id/cancel',
  authenticate,
  validateRequest({ body: cancelAppointmentSchema }),
  appointmentController.cancelAppointment
);

// Admin / Staff Appointment Queue (/api/v1/admin/appointments)
export const adminAppointmentRouter = express.Router();
adminAppointmentRouter.use(authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN', 'STAFF'));

adminAppointmentRouter.get('/', appointmentController.adminGetAppointments);
adminAppointmentRouter.patch(
  '/:id',
  validateRequest({ body: adminUpdateAppointmentSchema }),
  appointmentController.adminUpdateAppointment
);
adminAppointmentRouter.post(
  '/block-slot',
  validateRequest({ body: adminBlockSlotSchema }),
  appointmentController.adminBlockSlot
);

export default router;
