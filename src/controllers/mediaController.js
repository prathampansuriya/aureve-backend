import { MediaService } from '../services/mediaService.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const uploadSingle = asyncHandler(async (req, res) => {
  const asset = await MediaService.uploadSingleMedia({
    file: req.file,
    folder: req.body.folder,
    alt: req.body.alt,
    displayOrder: req.body.displayOrder,
    videoType: req.body.videoType
  });

  sendResponse(res, {
    statusCode: 201,
    message: 'Media asset uploaded successfully.',
    data: { asset }
  });
});

export const uploadMultiple = asyncHandler(async (req, res) => {
  const assets = await MediaService.uploadMultipleMedia({
    files: req.files,
    folder: req.body.folder,
    alts: req.body.alts,
    displayOrders: req.body.displayOrders
  });

  sendResponse(res, {
    statusCode: 201,
    message: `Successfully uploaded ${assets.length} media asset(s).`,
    data: {
      assets,
      count: assets.length
    }
  });
});

export const replaceMedia = asyncHandler(async (req, res) => {
  const asset = await MediaService.replaceMediaAsset({
    oldPublicId: req.body.oldPublicId,
    file: req.file,
    folder: req.body.folder,
    oldResourceType: req.body.oldResourceType,
    alt: req.body.alt,
    displayOrder: req.body.displayOrder
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Media asset replaced successfully.',
    data: { asset }
  });
});

export const deleteMedia = asyncHandler(async (req, res) => {
  const resourceType = req.query.resourceType || 'image';
  const result = await MediaService.deleteMediaAsset(req.params.publicId, resourceType);

  sendResponse(res, {
    statusCode: 200,
    message: 'Media asset deleted successfully from Cloudinary.',
    data: result
  });
});

export const batchDeleteMedia = asyncHandler(async (req, res) => {
  const resourceType = req.body.resourceType || 'image';
  const result = await MediaService.deleteBatchMediaAssets(req.body.publicIds, resourceType);

  sendResponse(res, {
    statusCode: 200,
    message: 'Batch media asset deletion completed.',
    data: result
  });
});

export const getUploadSignature = asyncHandler(async (req, res) => {
  const folder = req.body?.folder || req.query?.folder;
  const resourceType = req.body?.resourceType || req.query?.resourceType;

  const signatureData = MediaService.generateUploadSignature({
    folder,
    resourceType
  });

  sendResponse(res, {
    statusCode: 200,
    message: 'Direct upload signature generated.',
    data: signatureData
  });
});
