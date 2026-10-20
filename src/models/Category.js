import mongoose from 'mongoose';

const imageSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: [true, 'Image URL is required.'] },
    publicId: { type: String, required: [true, 'Cloudinary public ID is required.'] },
    alt: { type: String, default: 'AUREVÉ Fine Jewellery' }
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required.'],
      unique: true,
      trim: true,
      maxlength: [80, 'Category name cannot exceed 80 characters.']
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required.'],
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
    image: {
      type: imageSubSchema,
      required: [true, 'Category primary image is required.']
    },
    bannerImage: {
      type: imageSubSchema,
      default: null
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    metadata: {
      metaTitle: { type: String, default: '' },
      metaDescription: { type: String, default: '' },
      metaKeywords: { type: [String], default: [] }
    }
  },
  {
    timestamps: true
  }
);

categorySchema.index({ isActive: 1, displayOrder: 1 });

export const Category = mongoose.model('Category', categorySchema);
