import mongoose from 'mongoose';

const homepageSectionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Section key is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Section title is required.'],
      trim: true
    },
    subtitle: {
      type: String,
      trim: true,
      default: ''
    },
    sectionType: {
      type: String,
      enum: {
        values: ['CAROUSEL', 'GRID', 'EDITORIAL_FEATURE', 'SPLIT_BANNER', 'LOOKBOOK_FEED'],
        message: 'Invalid homepage section type: {VALUE}.'
      },
      required: [true, 'Section type is required.']
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
    targetCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    targetCollection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
      default: null
    },
    curatedProductIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product'
        }
      ],
      default: []
    },
    settings: {
      autoplay: { type: Boolean, default: true },
      intervalSeconds: { type: Number, default: 5 },
      itemsPerRow: { type: Number, default: 4 },
      backgroundTone: { type: String, default: 'ivory' }
    }
  },
  {
    timestamps: true
  }
);

homepageSectionSchema.index({ isActive: 1, displayOrder: 1 });

export const HomepageSection = mongoose.model('HomepageSection', homepageSectionSchema);
