import { addressService } from '../services/addressService.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.getAddresses(req.user._id);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Addresses retrieved successfully.',
    data: { addresses }
  });
});

export const getAddressById = asyncHandler(async (req, res) => {
  const address = await addressService.getAddressById(req.user._id, req.params.id);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Address retrieved successfully.',
    data: { address }
  });
});

export const createAddress = asyncHandler(async (req, res) => {
  const address = await addressService.createAddress(req.user._id, req.body);
  return sendResponse(res, {
    statusCode: 201,
    message: 'Address added successfully.',
    data: { address }
  });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = await addressService.updateAddress(req.user._id, req.params.id, req.body);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Address updated successfully.',
    data: { address }
  });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const result = await addressService.deleteAddress(req.user._id, req.params.id);
  return sendResponse(res, {
    statusCode: 200,
    message: result.message
  });
});

export const setDefaultShipping = asyncHandler(async (req, res) => {
  const address = await addressService.setDefaultShipping(req.user._id, req.params.id);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Default shipping address updated.',
    data: { address }
  });
});

export const setDefaultBilling = asyncHandler(async (req, res) => {
  const address = await addressService.setDefaultBilling(req.user._id, req.params.id);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Default billing address updated.',
    data: { address }
  });
});
