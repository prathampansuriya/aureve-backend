import mongoose from 'mongoose';

const reviewImageSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: [true, 'Review image URL is required.'] },
    publicId: { type: String, required: [true, 'Cloudinary public ID is required.'] }
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required.'],
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer user reference is required.'],
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required.'],
      min: [1, 'Minimum rating is 1 star.'],
      max: [5, 'Maximum rating is 5 stars.'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5.'
      }
    },
    title: {
      type: String,
      required: [true, 'Review title is required.'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters.']
    },
    comment: {
      type: String,
      required: [true, 'Review feedback is required.'],
      trim: true,
      maxlength: [1500, 'Comment cannot exceed 1500 characters.']
    },
    images: {
      type: [reviewImageSubSchema],
      default: []
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'APPROVED', 'REJECTED'],
        message: 'Invalid moderation status: {VALUE}.'
      },
      default: 'PENDING',
      index: true
    },
    moderatorNotes: {
      type: String,
      default: ''
    },
    helpfulVotes: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// One review per customer per product
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

export const Review = mongoose.model('Review', reviewSchema);
