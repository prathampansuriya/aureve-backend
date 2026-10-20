import * as contactInquiryService from '../services/contactInquiryService.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createInquiry = asyncHandler(async (req, res) => {
  const inquiry = await contactInquiryService.createContactInquiry(req.body);
  return sendResponse(res, {
    statusCode: 201,
    message: 'Your inquiry has been registered with our Maison Concierge.',
    data: inquiry
  });
});

export const listInquiries = asyncHandler(async (req, res) => {
  const result = await contactInquiryService.listContactInquiries(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Contact inquiries retrieved successfully.',
    data: result
  });
});

export const getInquiryById = asyncHandler(async (req, res) => {
  const inquiry = await contactInquiryService.getContactInquiryById(req.params.id);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Inquiry details retrieved successfully.',
    data: inquiry
  });
});

export const updateInquiry = asyncHandler(async (req, res) => {
  const inquiry = await contactInquiryService.updateContactInquiry(req.params.id, req.body, req.user);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Inquiry updated successfully.',
    data: inquiry
  });
});

export const deleteInquiry = asyncHandler(async (req, res) => {
  await contactInquiryService.deleteContactInquiry(req.params.id);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Inquiry deleted successfully.'
  });
});
