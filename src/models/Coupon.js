import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Coupon description is required.'],
      trim: true
    },
    discountType: {
      type: String,
      enum: {
        values: ['PERCENTAGE', 'FLAT_PAISE'],
        message: 'Invalid discount type: {VALUE}.'
      },
      required: [true, 'Discount type is required.']
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required.'],
      min: [1, 'Discount value must be at least 1.']
    },
    minOrderValuePaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'minOrderValuePaise must be an integer minor unit.'
      }
    },
    maxDiscountLimitPaise: {
      type: Number,
      default: null,
      validate: {
        validator: function (val) {
          return val === null || (Number.isInteger(val) && val >= 0);
        },
        message: 'maxDiscountLimitPaise must be an integer minor unit or null.'
      }
    },
    usageLimitTotal: {
      type: Number,
      default: null
    },
    usageLimitPerUser: {
      type: Number,
      default: 1,
      min: 1
    },
    applicableProducts: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product'
        }
      ],
      default: []
    },
    applicableCategories: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Category'
        }
      ],
      default: []
    },
    applicableCollections: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Collection'
        }
      ],
      default: []
    },
    redemptions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Order',
          default: null
        },
        redeemedAt: {
          type: Date,
          default: Date.now
        },
        discountPaise: {
          type: Number,
          default: 0
        }
      }
    ],
    usageCount: {
      type: Number,
      default: 0,
      min: 0
    },
    validFrom: {
      type: Date,
      required: [true, 'Coupon activation date is required.']
    },
    validUntil: {
      type: Date,
      required: [true, 'Coupon expiration date is required.'],
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Method to verify validity
couponSchema.methods.isValidNow = function () {
  const now = new Date();
  if (!this.isActive) return false;
  if (now < this.validFrom || now > this.validUntil) return false;
  if (this.usageLimitTotal !== null && this.usageCount >= this.usageLimitTotal) return false;
  return true;
};

export const Coupon = mongoose.model('Coupon', couponSchema);
