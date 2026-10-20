import mongoose from 'mongoose';

const bannerMediaSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: [true, 'Media URL is required.'] },
    publicId: { type: String, required: [true, 'Cloudinary public ID is required.'] }
  },
  { _id: false }
);

const bannerSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Banner unique key identifier is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Banner title is required.'],
      trim: true
    },
    subtitle: {
      type: String,
      trim: true,
      default: ''
    },
    ctaText: {
      type: String,
      trim: true,
      default: 'Discover the Masterpiece'
    },
    linkUrl: {
      type: String,
      trim: true,
      default: '/collections'
    },
    placement: {
      type: String,
      enum: {
        values: ['HERO_CAROUSEL', 'EDITORIAL_SPOTLIGHT', 'PROMOTIONAL_STRIP', 'CATEGORY_BILLBOARD', 'HERITAGE_BANNER'],
        message: 'Invalid banner placement: {VALUE}.'
      },
      required: [true, 'Banner placement section is required.'],
      index: true
    },
    desktopMedia: {
      type: bannerMediaSubSchema,
      required: [true, 'Desktop banner media is required.']
    },
    mobileMedia: {
      type: bannerMediaSubSchema,
      default: null
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
    schedule: {
      startAt: { type: Date, default: null },
      endAt: { type: Date, default: null }
    }
  },
  {
    timestamps: true
  }
);

bannerSchema.index({ placement: 1, isActive: 1, displayOrder: 1 });

export const Banner = mongoose.model('Banner', bannerSchema);
