import express from 'express';
import { reportExportController } from '../controllers/reportExportController.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

// Report exports require Admin or Super Admin privileges
router.use(authenticate);
router.use(authorizeRoles('ADMIN', 'SUPER_ADMIN'));

// Export Orders CSV Report
router.get('/orders', reportExportController.exportOrdersReport);

// Export Product Inventory CSV Report
router.get('/inventory', reportExportController.exportInventoryReport);

// Export Customers Growth CSV Report
router.get('/customers', reportExportController.exportCustomersReport);

export default router;
