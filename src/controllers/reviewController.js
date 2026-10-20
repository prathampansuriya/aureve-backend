import * as reviewService from '../services/reviewService.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getProductReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getProductReviews(req.params.productId, req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Product reviews retrieved successfully.',
    data: result
  });
});

export const createReview = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview({
    userId: req.user._id,
    ...req.body
  });

  return sendResponse(res, {
    statusCode: 201,
    message: 'Review submitted successfully. It will be publicly displayed once curated.',
    data: { review }
  });
});

export const voteHelpful = asyncHandler(async (req, res) => {
  const result = await reviewService.voteReviewHelpful(req.params.id, req.user._id);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Helpful vote recorded.',
    data: result
  });
});

export const adminListReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.adminListReviews(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Review moderation queue retrieved successfully.',
    data: result
  });
});

export const adminModerateReview = asyncHandler(async (req, res) => {
  const result = await reviewService.adminModerateReview(req.params.id, req.user, req.body);
  return sendResponse(res, {
    statusCode: 200,
    message: `Review has been ${req.body.status.toLowerCase()} successfully.`,
    data: result
  });
});
