import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
      index: true
    },
    tokenHash: {
      type: String,
      required: [true, 'Refresh token hash is required.'],
      unique: true,
      index: true
    },
    deviceFingerprint: {
      type: String,
      required: [true, 'Device fingerprint is required.'],
      trim: true
    },
    userAgent: {
      type: String,
      required: [true, 'User-Agent header is required.'],
      trim: true
    },
    ipAddress: {
      type: String,
      required: [true, 'IP address is required.'],
      trim: true
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true
    },
    replacedByTokenHash: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      required: [true, 'Session expiry date is required.'],
      index: { expires: 0 } // TTL index: auto-purged after 7 days
    }
  },
  {
    timestamps: true
  }
);

sessionSchema.index({ userId: 1, isRevoked: 1 });

export const Session = mongoose.model('Session', sessionSchema);
