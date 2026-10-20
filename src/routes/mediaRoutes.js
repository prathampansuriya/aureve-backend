import express from 'express';
import {
  uploadSingle,
  uploadMultiple,
  replaceMedia,
  deleteMedia,
  batchDeleteMedia,
  getUploadSignature
} from '../controllers/mediaController.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.js';
import { uploadSingle as multerSingle, uploadMultiple as multerMultiple } from '../middlewares/upload.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { mediaUploadLimiter } from '../middlewares/rateLimiter.js';
import {
  uploadMediaSchema,
  uploadMultipleMediaSchema,
  replaceMediaSchema,
  deleteMediaParamSchema,
  deleteMediaQuerySchema,
  batchDeleteMediaSchema,
  uploadSignatureSchema
} from '../validators/mediaValidator.js';

const router = express.Router();

// 1. Single media upload (Admin / Super-Admin only)
router.post(
  '/upload',
  mediaUploadLimiter,
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  multerSingle('file'),
  validateRequest({ body: uploadMediaSchema }),
  uploadSingle
);

// 2. Multiple media upload (up to 10 files, rollback on partial failures)
router.post(
  '/upload-multiple',
  mediaUploadLimiter,
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  multerMultiple('files', 10),
  validateRequest({ body: uploadMultipleMediaSchema }),
  uploadMultiple
);

// 3. Media asset replacement (uploads new asset, then deletes old publicId)
router.put(
  '/replace',
  mediaUploadLimiter,
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  multerSingle('file'),
  validateRequest({ body: replaceMediaSchema }),
  replaceMedia
);

// 4. Generate direct signed upload parameters for client-side uploads
router.post(
  '/signature',
  mediaUploadLimiter,
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validateRequest({ body: uploadSignatureSchema }),
  getUploadSignature
);

router.get(
  '/signature',
  mediaUploadLimiter,
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validateRequest({ query: uploadSignatureSchema }),
  getUploadSignature
);

// 5. Delete single media asset from Cloudinary
router.delete(
  '/:publicId',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validateRequest({
    params: deleteMediaParamSchema,
    query: deleteMediaQuerySchema
  }),
  deleteMedia
);

// 6. Batch delete media assets
router.post(
  '/batch-delete',
  authenticate,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validateRequest({ body: batchDeleteMediaSchema }),
  batchDeleteMedia
);

export default router;
