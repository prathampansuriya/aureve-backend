import * as pageContentService from '../services/pageContentService.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Public: Get CMS page content by key
 */
export const getPageContent = asyncHandler(async (req, res) => {
  const { pageKey } = req.params;
  const content = await pageContentService.getPageContent(pageKey, false);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Page content retrieved successfully',
    data: { page: content }
  });
});

/**
 * Admin: Get complete CMS page content (including unpublished sections)
 */
export const getAdminPageContent = asyncHandler(async (req, res) => {
  const { pageKey } = req.params;
  const content = await pageContentService.getPageContent(pageKey, true);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Administrative page content retrieved successfully',
    data: { page: content }
  });
});

/**
 * Admin: Update CMS page content
 */
export const updatePageContent = asyncHandler(async (req, res) => {
  const { pageKey } = req.params;
  const updated = await pageContentService.updatePageContent(pageKey, req.body, req.user);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Page content updated successfully',
    data: { page: updated }
  });
});
