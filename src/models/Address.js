import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
      index: true
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required.'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters.']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required.'],
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number.']
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: ''
    },
    addressLine1: {
      type: String,
      required: [true, 'Address line 1 is required.'],
      trim: true,
      maxlength: [150, 'Address line 1 cannot exceed 150 characters.']
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: [150, 'Address line 2 cannot exceed 150 characters.'],
      default: ''
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: [100, 'Landmark cannot exceed 100 characters.'],
      default: ''
    },
    city: {
      type: String,
      required: [true, 'City is required.'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State / Union Territory is required.'],
      trim: true
    },
    postalCode: {
      type: String,
      required: [true, 'PIN code is required.'],
      trim: true,
      match: [/^[1-9][0-9]{5}$/, 'Please provide a valid 6-digit Indian PIN code.']
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    },
    addressType: {
      type: String,
      enum: {
        values: ['HOME', 'WORK', 'OTHER'],
        message: 'Invalid address type: {VALUE}.'
      },
      default: 'HOME'
    },
    isDefaultShipping: {
      type: Boolean,
      default: false
    },
    isDefaultBilling: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

addressSchema.index({ userId: 1, isDefaultShipping: 1 });
addressSchema.index({ userId: 1, postalCode: 1 });

export const Address = mongoose.model('Address', addressSchema);
