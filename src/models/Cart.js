import mongoose from 'mongoose';

const cartItemSubSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required.']
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: [true, 'Product variant reference is required.']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required.'],
      min: [1, 'Quantity cannot be less than 1.'],
      max: [5, 'Maximum of 5 units allowed per high-value luxury creation.'],
      default: 1
    },
    priceInPaise: {
      type: Number,
      required: [true, 'Snapshot item price in paise is required.'],
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Cart item priceInPaise must be an exact integer minor unit.'
      }
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true,
      index: true
    },
    guestToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    items: {
      type: [cartItemSubSchema],
      default: []
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null
    },
    appliedCouponCode: {
      type: String,
      uppercase: true,
      trim: true,
      default: null
    },
    giftWrapping: {
      isRequested: { type: Boolean, default: false },
      message: { type: String, maxlength: 300, default: '' }
    },
    // Monetary integer paise snapshots
    subtotalPaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'subtotalPaise must be an integer minor unit.'
      }
    },
    makingChargesPaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'makingChargesPaise must be an integer minor unit.'
      }
    },
    discountPaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'discountPaise must be an integer minor unit.'
      }
    },
    gstPaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'gstPaise must be an integer minor unit.'
      }
    },
    totalPaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'totalPaise must be an integer minor unit.'
      }
    }
  },
  {
    timestamps: true
  }
);

export const Cart = mongoose.model('Cart', cartSchema);
