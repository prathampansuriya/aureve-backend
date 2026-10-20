import mongoose from 'mongoose';

const imageSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: [true, 'Image URL is required.'] },
    publicId: { type: String, required: [true, 'Cloudinary public ID is required.'] },
    alt: { type: String, default: 'AUREVÉ Haute Joaillerie Collection' },
    caption: { type: String, default: '' }
  },
  { _id: false }
);

const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Collection name is required.'],
      unique: true,
      trim: true,
      maxlength: [100, 'Collection name cannot exceed 100 characters.']
    },
    slug: {
      type: String,
      required: [true, 'Collection slug is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    tagline: {
      type: String,
      trim: true,
      default: ''
    },
    story: {
      type: String,
      required: [true, 'Collection editorial story is required.']
    },
    bannerImage: {
      type: imageSubSchema,
      required: [true, 'Collection hero banner image is required.']
    },
    thumbnailImage: {
      type: imageSubSchema,
      required: [true, 'Collection thumbnail image is required.']
    },
    lookbookImages: {
      type: [imageSubSchema],
      default: []
    },
    status: {
      type: String,
      enum: {
        values: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
        message: 'Invalid collection status: {VALUE}.'
      },
      default: 'ACTIVE',
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    merchandisingMetadata: {
      badge: { type: String, trim: true, default: '' },
      displayOrder: { type: Number, default: 0 },
      themeTone: { type: String, default: 'gold' }
    }
  },
  {
    timestamps: true
  }
);

collectionSchema.index({ status: 1, isFeatured: 1 });
collectionSchema.index({ status: 1, 'merchandisingMetadata.displayOrder': 1 });

export const Collection = mongoose.model('Collection', collectionSchema);
