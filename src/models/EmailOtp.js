import mongoose from 'mongoose';

const emailOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email address is required.'],
      lowercase: true,
      trim: true,
      index: true
    },
    otpHash: {
      type: String,
      required: [true, 'OTP hash is required.'],
      select: false
    },
    purpose: {
      type: String,
      enum: {
        values: ['ACCOUNT_ACTIVATION', 'PASSWORD_RESET', 'HIGH_VALUE_ORDER', 'LOGIN_VERIFICATION', 'EMAIL_CHANGE'],
        message: 'Invalid OTP purpose: {VALUE}.'
      },
      required: [true, 'OTP purpose is required.']
    },
    attempts: {
      type: Number,
      default: 0,
      max: [5, 'Maximum verification attempts exceeded.']
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required.'],
      index: { expires: 0 } // TTL index: auto-purged by MongoDB upon expiration
    }
  },
  {
    timestamps: true
  }
);

emailOtpSchema.index({ email: 1, purpose: 1, isUsed: 1 });

export const EmailOtp = mongoose.model('EmailOtp', emailOtpSchema);
