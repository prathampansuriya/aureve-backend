import mongoose from 'mongoose';

const variantMediaSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: [true, 'Variant media URL is required.'] },
    publicId: { type: String, required: [true, 'Cloudinary public ID is required.'] },
    alt: { type: String, default: 'AUREVÉ Variant Showcase' }
  },
  { _id: false }
);

const productVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Parent product reference is required.'],
      index: true
    },
    variantName: {
      type: String,
      required: [true, 'Variant name is required.'],
      trim: true
    },
    sku: {
      type: String,
      required: [true, 'Variant SKU is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    metalType: {
      type: String,
      enum: {
        values: ['YELLOW_GOLD', 'ROSE_GOLD', 'WHITE_GOLD', 'PLATINUM'],
        message: 'Invalid precious metal type: {VALUE}.'
      },
      required: [true, 'Metal type is required.']
    },
    metalPurity: {
      type: String,
      enum: {
        values: ['14K', '18K', '22K', '24K', '950_PLAT'],
        message: 'Invalid metal hallmark purity: {VALUE}.'
      },
      required: [true, 'Metal purity is required.']
    },
    size: {
      type: String,
      required: [true, 'Jewellery size/length specification is required.'],
      trim: true
    },
    grossWeightGrams: {
      type: Number,
      required: [true, 'Gross piece weight in grams is required.'],
      min: [0.01, 'Weight must be greater than zero.']
    },
    netGoldWeightGrams: {
      type: Number,
      required: [true, 'Net gold/platinum weight in grams is required.'],
      min: [0.01, 'Net weight must be greater than zero.']
    },
    diamondWeightCarat: {
      type: Number,
      default: 0,
      min: [0, 'Diamond weight cannot be negative.']
    },
    gemstoneSpecifications: {
      stoneType: { type: String, default: '' },
      count: { type: Number, default: 0 },
      weightCarat: { type: Number, default: 0 },
      cut: { type: String, default: '' }
    },
    // Monetary persistence in integer minor units (Paise)
    priceInPaise: {
      type: Number,
      required: [true, 'Variant price in paise is required.'],
      min: [0, 'Price cannot be negative.'],
      validate: {
        validator: Number.isInteger,
        message: 'priceInPaise must be an exact integer minor unit.'
      }
    },
    discountPriceInPaise: {
      type: Number,
      default: null,
      validate: {
        validator: function (val) {
          return val === null || (Number.isInteger(val) && val >= 0);
        },
        message: 'discountPriceInPaise must be an integer minor unit or null.'
      }
    },
    // Inventory Invariants
    inventoryCount: {
      type: Number,
      required: [true, 'Inventory count is required.'],
      min: [0, 'Inventory cannot fall below zero.'],
      default: 1
    },
    reservedCount: {
      type: Number,
      default: 0,
      min: [0, 'Reserved inventory cannot fall below zero.']
    },
    availability: {
      type: String,
      enum: {
        values: ['AVAILABLE', 'MADE_TO_ORDER', 'DEPLETED'],
        message: 'Invalid variant availability state: {VALUE}.'
      },
      default: 'AVAILABLE',
      index: true
    },
    variantSpecificMedia: {
      type: [variantMediaSubSchema],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for real-time unreserved stock
productVariantSchema.virtual('availableStock').get(function () {
  return Math.max(0, this.inventoryCount - this.reservedCount);
});

// Compound unique index ensuring uniqueness per product variation
productVariantSchema.index(
  { productId: 1, metalType: 1, metalPurity: 1, size: 1 },
  { unique: true }
);

productVariantSchema.index({ productId: 1, isActive: 1, availability: 1 });
productVariantSchema.index({ priceInPaise: 1 });

export const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);
