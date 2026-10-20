import express from 'express';
import * as storeLocationController from '../controllers/storeLocationController.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createStoreLocationSchema,
  updateStoreLocationSchema
} from '../validators/storeLocationValidator.js';

const router = express.Router();

// Public routes (/api/v1/stores)
router.get('/', storeLocationController.getActiveStores);
router.get('/:idOrSlug', storeLocationController.getStoreByIdOrSlug);

// Admin sub-router (/api/v1/admin/stores)
export const adminStoreRouter = express.Router();
adminStoreRouter.use(authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'));

adminStoreRouter.get('/', storeLocationController.adminListStores);
adminStoreRouter.post(
  '/',
  validateRequest({ body: createStoreLocationSchema }),
  storeLocationController.adminCreateStore
);
adminStoreRouter.patch(
  '/:id',
  validateRequest({ body: updateStoreLocationSchema }),
  storeLocationController.adminUpdateStore
);
adminStoreRouter.delete('/:id', storeLocationController.adminDeleteStore);

export default router;
