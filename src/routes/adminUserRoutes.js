import express from 'express';
import { adminUserController } from '../controllers/adminUserController.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createAdminUserSchema,
  updateUserStatusSchema,
  updateUserRoleSchema
} from '../validators/adminUserValidator.js';

const router = express.Router();

// All admin user routes require active authentication
router.use(authenticate);

// List all user accounts with search, role, status filters, and pagination (Admin + Super Admin)
router.get('/', authorizeRoles('ADMIN', 'SUPER_ADMIN'), adminUserController.listUsers);

// Retrieve detailed user profile including order history, addresses, and appointments (Admin + Super Admin)
router.get('/:id', authorizeRoles('ADMIN', 'SUPER_ADMIN'), adminUserController.getUserDetails);

// Modify user account status (ACTIVE, SUSPENDED, LOCKED) with audit log (Admin + Super Admin)
router.patch(
  '/:id/status',
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validateRequest({ body: updateUserStatusSchema }),
  adminUserController.updateUserStatus
);

// Create a new administrative user (STAFF or ADMIN) - Super Admin only
router.post(
  '/',
  authorizeRoles('SUPER_ADMIN'),
  validateRequest({ body: createAdminUserSchema }),
  adminUserController.createAdministrativeUser
);

// Promote or demote user role with audit log - Super Admin only (prevents self-demotion)
router.patch(
  '/:id/role',
  authorizeRoles('SUPER_ADMIN'),
  validateRequest({ body: updateUserRoleSchema }),
  adminUserController.updateUserRole
);

export default router;
