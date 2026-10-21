import mongoose from 'mongoose';
import './Category.js';
import './Collection.js';
import './ProductVariant.js';

const productImageSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: [true, 'Image URL is required.'] },
    publicId: { type: String, required: [true, 'Cloudinary public ID is required.'] },
    alt: { type: String, default: 'AUREVÉ Fine Jewellery Piece' },
    isPrimary: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 }
  },
  { _id: true }
);

const productVideoSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: [true, 'Video URL is required.'] },
    publicId: { type: String, required: [true, 'Cloudinary public ID is required.'] },
    videoType: {
      type: String,
      enum: {
        values: ['PRODUCT_360', 'MODEL_WEARING', 'CRAFTING_STORY'],
        message: 'Invalid video type: {VALUE}.'
      },
      default: 'PRODUCT_360'
    },
    aspectRatio: {
      type: String,
      enum: {
        values: ['16:9', '9:16', '1:1', '4:3'],
        message: 'Invalid aspect ratio: {VALUE}.'
      },
      default: '16:9'
    },
    durationSeconds: { type: Number, default: 0 },
    thumbnail: { type: String, default: '' }
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required.'],
      trim: true,
      maxlength: [180, 'Product title cannot exceed 180 characters.']
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    sku: {
      type: String,
      required: [true, 'Master SKU is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [250, 'Subtitle cannot exceed 250 characters.'],
      default: ''
    },
    shortDescription: {
      type: String,
      trim: true,
      default: ''
    },
    description: {
      type: String,
      required: [true, 'Detailed product description is required.']
    },
    story: {
      type: String,
      default: ''
    },
    careInstructions: {
      type: String,
      default: 'Store in AUREVÉ velvet box. Avoid direct contact with perfumes, moisture, and harsh chemicals. Clean with a soft lint-free chamois cloth.'
    },
    materialInformation: {
      type: String,
      default: ''
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required.'],
      index: true
    },
    collectionIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Collection'
        }
      ],
      default: [],
      index: true
    },
    tags: {
      type: [String],
      default: [],
      index: true
    },
    // Demographic & Style Attributes
    gender: {
      type: String,
      enum: {
        values: ['WOMEN', 'MEN', 'UNISEX'],
        message: 'Invalid gender specification: {VALUE}.'
      },
      default: 'WOMEN',
      index: true
    },
    occasion: {
      type: String,
      enum: {
        values: ['BRIDAL', 'EVERYDAY_LUXURY', 'COCKTAIL', 'HERITAGE'],
        message: 'Invalid occasion: {VALUE}.'
      },
      default: 'BRIDAL',
      index: true
    },
    availability: {
      type: String,
      enum: {
        values: ['IN_STOCK', 'MADE_TO_ORDER', 'OUT_OF_STOCK'],
        message: 'Invalid availability state: {VALUE}.'
      },
      default: 'IN_STOCK',
      index: true
    },
    // Hallmarking & Certification Integrity
    hallmarking: {
      bisHallmarked: {
        type: Boolean,
        default: true
      },
      huidNumber: {
        type: String,
        trim: true,
        uppercase: true,
        default: ''
      },
      certification: {
        type: String,
        enum: {
          values: ['GIA', 'IGI', 'SGL', 'BIS_GOVT', 'IN_HOUSE'],
          message: 'Invalid certification authority: {VALUE}.'
        },
        default: 'BIS_GOVT'
      },
      certificateNumber: {
        type: String,
        trim: true,
        default: ''
      }
    },
    // Supported Precious Metals & Gemstone Overview
    materialOverview: {
      primaryMetal: {
        type: String,
        enum: ['YELLOW_GOLD', 'ROSE_GOLD', 'WHITE_GOLD', 'PLATINUM'],
        default: 'YELLOW_GOLD'
      },
      primaryPurity: {
        type: String,
        enum: ['14K', '18K', '22K', '24K', '950_PLAT'],
        default: '18K'
      },
      hasDiamonds: { type: Boolean, default: false },
      diamondDetails: {
        caratWeight: { type: Number, default: 0 },
        clarity: { type: String, default: 'VVS-VS' },
        colorGrade: { type: String, default: 'G-H' },
        cutGrade: { type: String, default: 'Excellent' }
      },
      hasGemstones: { type: Boolean, default: false },
      gemstoneTypes: { type: [String], default: [] }
    },
    // Financial Valuation in Integer Minor Units (Paise)
    pricing: {
      baseMetalPricePaise: {
        type: Number,
        required: [true, 'Base metal price in paise is required.'],
        min: [0, 'Base metal price cannot be negative.']
      },
      diamondStonePricePaise: {
        type: Number,
        default: 0,
        min: [0, 'Stone price cannot be negative.']
      },
      makingChargesPaise: {
        type: Number,
        default: 0,
        min: [0, 'Making charges cannot be negative.']
      },
      discountPricePaise: {
        type: Number,
        default: null,
        min: [0, 'Discount price cannot be negative.']
      },
      gstRate: {
        type: Number,
        default: 3, // Standard 3% GST on jewellery in India
        min: 0,
        max: 28
      },
      calculatedPricePaise: {
        type: Number,
        default: 0,
        index: true
      }
    },
    // Merchandising & Highlights
    isNewArrival: { type: Boolean, default: true, index: true },
    isBestseller: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isLimitedEdition: { type: Boolean, default: false, index: true },
    limitedEditionDetails: {
      editionName: { type: String, default: '' },
      totalEditionQuantity: { type: Number, default: 0 },
      remainingStock: { type: Number, default: 0 },
      availabilityWindow: {
        startAt: { type: Date, default: null },
        endAt: { type: Date, default: null }
      },
      exclusiveLabel: { type: String, default: 'Limited Masterpiece' }
    },
    // Media Assets
    images: {
      type: [productImageSubSchema],
      validate: [val => val.length > 0, 'At least one product showcase image is required.']
    },
    videos: {
      type: [productVideoSubSchema],
      default: []
    },
    // Ratings & Reviews Aggregates
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    // Real Engagement Metrics (Telemetric & Aggregated Counters)
    engagement: {
      viewCount: {
        type: Number,
        default: 0,
        min: 0,
        index: true
      }
    },
    // Lifecycle Status
    status: {
      type: String,
      enum: {
        values: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
        message: 'Invalid catalog status: {VALUE}.'
      },
      default: 'DRAFT',
      index: true
    },
    seoMetadata: {
      metaTitle: { type: String, default: '' },
      metaDescription: { type: String, default: '' },
      metaKeywords: { type: [String], default: [] }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual relationship to child ProductVariants
productSchema.virtual('variants', {
  ref: 'ProductVariant',
  localField: '_id',
  foreignField: 'productId'
});

// Virtual relationship to Category
productSchema.virtual('category', {
  ref: 'Category',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true
});

// Virtual relationship to Collections
productSchema.virtual('collections', {
  ref: 'Collection',
  localField: 'collectionIds',
  foreignField: '_id'
});

// Virtual calculation for pre-tax base total in INR
productSchema.virtual('totalPreTaxPaise').get(function () {
  const base = (this.pricing?.baseMetalPricePaise || 0) +
               (this.pricing?.diamondStonePricePaise || 0) +
               (this.pricing?.makingChargesPaise || 0);
  return this.pricing?.discountPricePaise ? this.pricing.discountPricePaise : base;
});

productSchema.virtual('pricePaise').get(function () {
  return this.pricing?.calculatedPricePaise || this.totalPreTaxPaise || 0;
});

// Pre-save hook to ensure calculatedPricePaise is always synchronized
productSchema.pre('save', function (next) {
  if (this.pricing) {
    const base = (this.pricing.baseMetalPricePaise || 0) +
                 (this.pricing.diamondStonePricePaise || 0) +
                 (this.pricing.makingChargesPaise || 0);
    this.pricing.calculatedPricePaise = this.pricing.discountPricePaise
      ? this.pricing.discountPricePaise
      : base;
  }
  if (typeof next === 'function') next();
});

// Compound Indexes for catalog performance
productSchema.index({ categoryId: 1, status: 1, availability: 1 });
productSchema.index({ status: 1, isFeatured: 1, createdAt: -1 });
productSchema.index({ status: 1, isBestseller: 1 });
productSchema.index({ status: 1, gender: 1, occasion: 1 });

// Full-Text Search Compound Index
productSchema.index(
  {
    title: 'text',
    description: 'text',
    shortDescription: 'text',
    tags: 'text',
    sku: 'text'
  },
  {
    weights: {
      title: 10,
      sku: 8,
      tags: 5,
      shortDescription: 3,
      description: 1
    },
    name: 'ProductCatalogTextIndex'
  }
);

export const Product = mongoose.model('Product', productSchema);
