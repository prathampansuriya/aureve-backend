import mongoose from 'mongoose';

const wishlistItemSubSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required.']
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      default: null
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
      unique: true,
      index: true
    },
    items: {
      type: [wishlistItemSubSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export const Wishlist = mongoose.model('Wishlist', wishlistSchema);
