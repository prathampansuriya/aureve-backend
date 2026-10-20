import * as storeLocationService from '../services/storeLocationService.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getActiveStores = asyncHandler(async (req, res) => {
  const stores = await storeLocationService.getActiveStoreLocations(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Active showrooms retrieved successfully.',
    data: { stores }
  });
});

export const getStoreByIdOrSlug = asyncHandler(async (req, res) => {
  const store = await storeLocationService.getStoreLocationByIdOrSlug(req.params.idOrSlug);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Showroom details retrieved successfully.',
    data: { store }
  });
});

export const adminListStores = asyncHandler(async (req, res) => {
  const result = await storeLocationService.getAllStoreLocationsAdmin(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Showrooms retrieved successfully.',
    data: result
  });
});

export const adminCreateStore = asyncHandler(async (req, res) => {
  const store = await storeLocationService.createStoreLocation(req.body);
  return sendResponse(res, {
    statusCode: 201,
    message: 'Showroom created successfully.',
    data: { store }
  });
});

export const adminUpdateStore = asyncHandler(async (req, res) => {
  const store = await storeLocationService.updateStoreLocation(req.params.id, req.body);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Showroom updated successfully.',
    data: { store }
  });
});

export const adminDeleteStore = asyncHandler(async (req, res) => {
  const result = await storeLocationService.deleteStoreLocation(req.params.id);
  return sendResponse(res, {
    statusCode: 200,
    message: result.message
  });
});
