import mongoose from 'mongoose';

const passwordResetTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required.'],
      index: true
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required.'],
      unique: true,
      index: true
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required.'],
      index: { expires: 0 } // TTL index: auto-purged by MongoDB
    }
  },
  {
    timestamps: true
  }
);

passwordResetTokenSchema.index({ userId: 1, isUsed: 1 });

export const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
