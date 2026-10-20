import mongoose from 'mongoose';

const bespokeEnquirySchema = new mongoose.Schema(
  {
    inquiryCode: {
      type: String,
      required: [true, 'Inquiry reference code is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    clientName: {
      type: String,
      required: [true, 'Client name is required.'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters.']
    },
    clientEmail: {
      type: String,
      required: [true, 'Client email is required.'],
      lowercase: true,
      trim: true,
      index: true
    },
    clientPhone: {
      type: String,
      required: [true, 'Client contact telephone is required.'],
      trim: true
    },
    pieceType: {
      type: String,
      required: [true, 'Jewellery piece type is required.'],
      trim: true
    },
    metalPreference: {
      type: String,
      trim: true,
      default: ''
    },
    gemstonePreference: {
      type: String,
      trim: true,
      default: ''
    },
    budgetTier: {
      type: String,
      trim: true,
      default: ''
    },
    consultationMode: {
      type: String,
      enum: {
        values: ['IN_STORE_VIP', 'VIRTUAL_CONSULTATION'],
        message: 'Invalid consultation mode: {VALUE}.'
      },
      default: 'IN_STORE_VIP',
      index: true
    },
    visionNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Vision notes cannot exceed 2000 characters.']
    },
    status: {
      type: String,
      enum: {
        values: ['NEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'],
        message: 'Invalid inquiry status: {VALUE}.'
      },
      default: 'NEW',
      index: true
    },
    adminNotes: {
      type: String,
      trim: true,
      default: ''
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    preferredDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

bespokeEnquirySchema.index({ status: 1, createdAt: -1 });

export const BespokeEnquiry = mongoose.model('BespokeEnquiry', bespokeEnquirySchema);
