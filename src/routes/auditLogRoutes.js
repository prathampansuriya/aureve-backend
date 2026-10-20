import express from 'express';
import { auditLogController } from '../controllers/auditLogController.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

// Audit log inspection is strictly restricted to Super Admin
router.use(authenticate);
router.use(authorizeRoles('SUPER_ADMIN'));

// Retrieve paginated audit logs with action, entity, performer, and date range filters
router.get('/', auditLogController.listAuditLogs);

export default router;
