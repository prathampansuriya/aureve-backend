import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Offer title is required.'],
      trim: true
    },
    slug: {
      type: String,
      required: [true, 'Offer slug is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
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
      min: 1
    },
    offerType: {
      type: String,
      enum: {
        values: ['FESTIVAL', 'COLLECTION', 'PRODUCT', 'STOREWIDE'],
        message: 'Invalid offer type: {VALUE}.'
      },
      default: 'FESTIVAL',
      index: true
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
    minOrderValuePaise: {
      type: Number,
      default: 0,
      min: 0
    },
    maxDiscountPaise: {
      type: Number,
      default: null
    },
    priority: {
      type: Number,
      default: 0,
      index: true
    },
    allowStackingWithCoupons: {
      type: Boolean,
      default: false
    },
    bannerUrl: {
      type: String,
      default: ''
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required.']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required.'],
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

offerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

export const Offer = mongoose.model('Offer', offerSchema);
