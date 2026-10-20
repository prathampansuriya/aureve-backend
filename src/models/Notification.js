import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Notification title is required.'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Notification message is required.'],
      trim: true
    },
    type: {
      type: String,
      enum: {
        values: [
          'ORDER_UPDATE',
          'PAYMENT_UPDATE',
          'APPOINTMENT_REMINDER',
          'APPOINTMENT_UPDATE',
          'REVIEW_MODERATION',
          'SECURITY_ALERT',
          'PROMOTION'
        ],
        message: 'Invalid notification type: {VALUE}.'
      },
      required: [true, 'Notification type is required.'],
      index: true
    },
    linkUrl: {
      type: String,
      default: ''
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true
    },
    emailSent: {
      type: Boolean,
      default: false
    },
    emailDelivered: {
      type: Boolean,
      default: false
    },
    emailError: {
      type: String,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, idempotencyKey: 1 }, { sparse: true });

export const Notification = mongoose.model('Notification', notificationSchema);
