import * as bespokeEnquiryService from '../services/bespokeEnquiryService.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Public: Submit a bespoke jewellery commission enquiry
 */
export const createEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await bespokeEnquiryService.createEnquiry(req.body);
  return sendResponse(res, {
    statusCode: 201,
    message: 'Bespoke commission enquiry submitted successfully',
    data: { enquiry }
  });
});

/**
 * Admin: List all bespoke enquiries with pagination & filters
 */
export const listEnquiries = asyncHandler(async (req, res) => {
  const result = await bespokeEnquiryService.listEnquiries(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Bespoke enquiries retrieved successfully',
    data: result
  });
});

/**
 * Admin: Get enquiry details by ID
 */
export const getEnquiryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const enquiry = await bespokeEnquiryService.getEnquiryById(id);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Bespoke enquiry retrieved successfully',
    data: { enquiry }
  });
});

/**
 * Admin: Update enquiry status or notes
 */
export const updateEnquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await bespokeEnquiryService.updateEnquiry(id, req.body, req.user);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Bespoke enquiry updated successfully',
    data: { enquiry: updated }
  });
});
