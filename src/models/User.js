import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required.'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters.']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required.'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters.']
    },
    email: {
      type: String,
      required: [true, 'Email address is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address.']
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number.']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required.'],
      select: false
    },
    role: {
      type: String,
      enum: {
        values: ['CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'],
        message: 'Invalid user role: {VALUE}.'
      },
      default: 'CUSTOMER',
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'SUSPENDED', 'LOCKED'],
        message: 'Invalid account status: {VALUE}.'
      },
      default: 'ACTIVE',
      index: true
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    defaultShippingAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      default: null
    },
    defaultBillingAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      default: null
    },
    preferences: {
      ringSize: { type: Number, min: 6, max: 30, default: null },
      bangleSize: { type: String, trim: true, default: null },
      newsletter: { type: Boolean, default: false },
      smsAlerts: { type: Boolean, default: true },
      whatsappAlerts: { type: Boolean, default: false }
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for formatted full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Helper method to verify if account is currently locked
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Compound index for administrative searches
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });

export const User = mongoose.model('User', userSchema);
