import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { createPersistentNotification } from './notificationService.js';
import { sendReviewModerationEmail } from './emailService.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

/**
 * Submits an authenticated customer review.
 * Strictly verifies whether the customer has a DELIVERED order for the product.
 */
export const createReview = async ({
  userId,
  productId,
  rating,
  title,
  comment,
  images = []
}) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new NotFoundError('Product not found.');
  }

  // Duplicate-review policy: One review per customer per product
  const existingReview = await Review.findOne({ userId, productId });
  if (existingReview) {
    throw new ConflictError('You have already submitted a review for this product.');
  }

  // Verified purchase check: Query real orders in DELIVERED status containing this product
  const deliveredOrder = await Order.findOne({
    userId,
    orderStatus: 'DELIVERED',
    'items.productId': productId
  }).select('_id');

  const isVerifiedPurchase = Boolean(deliveredOrder);

  const review = new Review({
    productId,
    userId,
    orderId: deliveredOrder?._id || null,
    rating: parseInt(rating, 10),
    title: title.trim(),
    comment: comment.trim(),
    images: Array.isArray(images) ? images : [],
    isVerifiedPurchase,
    status: 'PENDING',
    helpfulVotes: 0
  });

  await review.save();

  // Create persistent notification informing customer their review was queued for moderation
  createPersistentNotification({
    userId,
    title: 'Review Submitted for Curation',
    message: `Your testimonial for "${product.title}" has been received and is being curated by our atelier team.`,
    type: 'REVIEW_MODERATION',
    linkUrl: `/products/${product.slug}`,
    metadata: { reviewId: review._id, productId: product._id }
  }).catch((err) => {
    logger.error(`[REVIEW NOTIF ERROR] ${err.message}`);
  });

  return review;
};

/**
 * Public display of approved reviews only, with aggregated rating statistics.
 */
export const getProductReviews = async (
  productId,
  { page = 1, limit = 10, sort = 'helpful' } = {}
) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new NotFoundError('Product not found.');
  }

  const query = {
    productId,
    status: 'APPROVED'
  };

  const sortOptions = {
    helpful: { helpfulVotes: -1, createdAt: -1 },
    latest: { createdAt: -1 },
    highest: { rating: -1, createdAt: -1 },
    lowest: { rating: 1, createdAt: -1 }
  };
  const selectedSort = sortOptions[sort] || sortOptions.helpful;

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (numericPage - 1) * numericLimit;

  const [reviews, totalApproved, aggregateStats] = await Promise.all([
    Review.find(query)
      .populate('userId', 'firstName lastName avatarUrl')
      .sort(selectedSort)
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    Review.countDocuments(query),
    Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId), status: 'APPROVED' } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  // Compute rating breakdown
  const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRatingSum = 0;
  for (const item of aggregateStats) {
    starCounts[item._id] = item.count;
    totalRatingSum += item._id * item.count;
  }

  const averageRating = totalApproved > 0 ? Math.round((totalRatingSum / totalApproved) * 10) / 10 : 0;

  const starBreakdown = {};
  for (let star = 5; star >= 1; star--) {
    const count = starCounts[star] || 0;
    const percentage = totalApproved > 0 ? Math.round((count / totalApproved) * 100) : 0;
    starBreakdown[`star${star}`] = { count, percentage };
  }

  return {
    summary: {
      averageRating,
      totalReviews: totalApproved,
      starBreakdown
    },
    reviews,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total: totalApproved,
      totalPages: Math.ceil(totalApproved / numericLimit) || 1
    }
  };
};

/**
 * Registers a helpful vote for an approved review.
 */
export const voteReviewHelpful = async (reviewId, userId) => {
  const review = await Review.findOne({ _id: reviewId, status: 'APPROVED' });
  if (!review) {
    throw new NotFoundError('Approved review not found.');
  }

  if (review.userId.toString() === userId.toString()) {
    throw new BadRequestError('You cannot vote for your own review.');
  }

  review.helpfulVotes += 1;
  await review.save();
  return { helpfulVotes: review.helpfulVotes };
};

/**
 * Administrative review moderation queue.
 */
export const adminListReviews = async ({ status, productId, page = 1, limit = 20 } = {}) => {
  const query = {};
  if (status) {
    query.status = status;
  }
  if (productId) {
    query.productId = productId;
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('productId', 'title slug images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    Review.countDocuments(query)
  ]);

  return {
    reviews,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit) || 1
    }
  };
};

/**
 * Moderates a customer review (Approved or Rejected) and recalculates product rating aggregates.
 */
export const adminModerateReview = async (reviewId, adminUser, { status, moderatorNotes = '' }) => {
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new BadRequestError('Status must be either APPROVED or REJECTED.');
  }

  const review = await Review.findById(reviewId).populate('productId', 'title slug');
  if (!review) {
    throw new NotFoundError('Review not found.');
  }

  review.status = status;
  if (moderatorNotes) {
    review.moderatorNotes = moderatorNotes;
  }
  await review.save();

  // Recalculate Product averageRating and reviewCount strictly from APPROVED reviews
  const stats = await Review.aggregate([
    { $match: { productId: review.productId._id, status: 'APPROVED' } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  const averageRating = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  const reviewCount = stats.length > 0 ? stats[0].count : 0;

  await Product.findByIdAndUpdate(review.productId._id, {
    averageRating,
    reviewCount
  });

  // Fetch author details for notification
  const author = await User.findById(review.userId).select('firstName lastName email');
  if (author) {
    sendReviewModerationEmail({
      to: author.email,
      name: `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Patron',
      productTitle: review.productId.title,
      status,
      moderatorNotes
    }).catch(() => {});

    createPersistentNotification({
      userId: author._id,
      title: `Review ${status === 'APPROVED' ? 'Published' : 'Moderated'}`,
      message:
        status === 'APPROVED'
          ? `Your review for "${review.productId.title}" has been approved and published.`
          : `Your review for "${review.productId.title}" was not approved. Reason: ${moderatorNotes || 'Community guidelines'}`,
      type: 'REVIEW_MODERATION',
      linkUrl: `/products/${review.productId.slug}`,
      metadata: { reviewId: review._id, status }
    }).catch(() => {});
  }

  return {
    review,
    productAggregates: {
      averageRating,
      reviewCount
    }
  };
};
