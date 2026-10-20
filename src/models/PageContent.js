import mongoose from 'mongoose';

const pageMediaSubSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    mediaType: {
      type: String,
      enum: ['IMAGE', 'VIDEO'],
      default: 'IMAGE'
    },
    alt: { type: String, default: 'AUREVÉ Haute Joaillerie' }
  },
  { _id: false }
);

const pageSectionSubSchema = new mongoose.Schema(
  {
    sectionKey: {
      type: String,
      required: [true, 'Section key is required.'],
      trim: true
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
    description: {
      type: String,
      trim: true,
      default: ''
    },
    mediaUrl: {
      type: String,
      trim: true,
      default: ''
    },
    mediaType: {
      type: String,
      enum: ['IMAGE', 'VIDEO'],
      default: 'IMAGE'
    },
    items: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    isPublished: {
      type: Boolean,
      default: true
    }
  },
  { _id: true }
);

const pageContentSchema = new mongoose.Schema(
  {
    pageKey: {
      type: String,
      required: [true, 'Page key is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      enum: {
        values: ['OUR_STORY', 'BESPOKE_SERVICES', 'TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
        message: 'Invalid page key: {VALUE}.'
      },
      index: true
    },
    title: {
      type: String,
      required: [true, 'Page title is required.'],
      trim: true
    },
    subtitle: {
      type: String,
      trim: true,
      default: ''
    },
    heroDescription: {
      type: String,
      trim: true,
      default: ''
    },
    heroMedia: {
      type: pageMediaSubSchema,
      default: () => ({})
    },
    sections: {
      type: [pageSectionSubSchema],
      default: []
    },
    cta: {
      title: { type: String, default: 'Reserve a Private Salon Consultation' },
      subtitle: { type: String, default: 'Experience generational craftsmanship firsthand in our flagship salons.' },
      buttonText: { type: String, default: 'Book VIP Appointment' },
      buttonLink: { type: String, default: '/appointments' }
    },
    seo: {
      metaTitle: { type: String, default: 'AUREVÉ Haute Joaillerie' },
      metaDescription: { type: String, default: 'Jewels of Legacy. Crafted for Eternity.' }
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

pageContentSchema.index({ pageKey: 1, isPublished: 1 });

export const PageContent = mongoose.model('PageContent', pageContentSchema);
