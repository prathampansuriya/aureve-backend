import mongoose from 'mongoose';

const storeImageSubSchema = new mongoose.Schema(
  {
    url: { type: String, required: [true, 'Store image URL is required.'] },
    publicId: { type: String, required: [true, 'Cloudinary public ID is required.'] }
  },
  { _id: false }
);

const storeLocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Showroom name is required.'],
      unique: true,
      trim: true
    },
    slug: {
      type: String,
      required: [true, 'Showroom slug is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    addressLine: {
      type: String,
      required: [true, 'Address is required.'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required.'],
      trim: true,
      index: true
    },
    state: {
      type: String,
      required: [true, 'State is required.'],
      trim: true
    },
    postalCode: {
      type: String,
      required: [true, 'PIN code is required.'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Contact phone is required.'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Contact email is required.'],
      lowercase: true,
      trim: true
    },
    openingHours: {
      weekdays: { type: String, default: '10:30 AM – 8:30 PM' },
      weekends: { type: String, default: '11:00 AM – 9:00 PM' }
    },
    coordinates: {
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 }
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
      trim: true
    },
    appointmentConfig: {
      slotDurationMinutes: { type: Number, default: 60, min: 15, max: 180 },
      capacityPerSlot: { type: Number, default: 2, min: 1, max: 10 },
      openingHour: { type: Number, default: 10, min: 0, max: 23 },
      closingHour: { type: Number, default: 20, min: 0, max: 23 },
      leadTimeHours: { type: Number, default: 2, min: 0 },
      cancellationLeadTimeHours: { type: Number, default: 4, min: 0 },
      virtualEnabled: { type: Boolean, default: true },
      inStoreEnabled: { type: Boolean, default: true }
    },
    vipLoungeAvailable: {
      type: Boolean,
      default: true
    },
    images: {
      type: [storeImageSubSchema],
      default: []
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

export const StoreLocation = mongoose.model('StoreLocation', storeLocationSchema);
