import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { objectIdParamSchema } from '../utils/queryHelper.js';
import { createAddressSchema, updateAddressSchema } from '../validators/addressValidator.js';
import * as addressController from '../controllers/addressController.js';

const router = express.Router();

// All address routes require authenticated customer
router.use(authenticate);

router
  .route('/')
  .get(addressController.getAddresses)
  .post(validateRequest({ body: createAddressSchema }), addressController.createAddress);

router
  .route('/:id')
  .get(validateRequest({ params: objectIdParamSchema }), addressController.getAddressById)
  .put(validateRequest({ params: objectIdParamSchema, body: updateAddressSchema }), addressController.updateAddress)
  .delete(validateRequest({ params: objectIdParamSchema }), addressController.deleteAddress);

router.patch(
  '/:id/default-shipping',
  validateRequest({ params: objectIdParamSchema }),
  addressController.setDefaultShipping
);

router.patch(
  '/:id/default-billing',
  validateRequest({ params: objectIdParamSchema }),
  addressController.setDefaultBilling
);

export default router;
