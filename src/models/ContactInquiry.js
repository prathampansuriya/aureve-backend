import mongoose from 'mongoose';

const contactInquirySchema = new mongoose.Schema(
  {
    inquiryNumber: {
      type: String,
      unique: true,
      index: true
    },
    fullName: {
      type: String,
      required: [true, 'Patron full name is required.'],
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: [true, 'Patron email address is required.'],
      trim: true,
      lowercase: true,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    subject: {
      type: String,
      required: [true, 'Inquiry subject is required.'],
      trim: true,
      default: 'General Inquiry'
    },
    preferredChannel: {
      type: String,
      enum: ['EMAIL', 'PHONE', 'WHATSAPP'],
      default: 'EMAIL'
    },
    message: {
      type: String,
      required: [true, 'Inquiry message is required.'],
      trim: true,
      maxlength: 3000
    },
    status: {
      type: String,
      enum: {
        values: ['NEW', 'IN_REVIEW', 'CONTACTED', 'RESOLVED', 'ARCHIVED'],
        message: 'Invalid status: {VALUE}.'
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
    respondedAt: {
      type: Date,
      default: null
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

contactInquirySchema.pre('save', function (next) {
  if (!this.inquiryNumber) {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    this.inquiryNumber = `INQ-${randomSuffix}`;
  }
  next();
});

export const ContactInquiry = mongoose.model('ContactInquiry', contactInquirySchema);
