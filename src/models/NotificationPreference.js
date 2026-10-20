import mongoose from 'mongoose';

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required.'],
      unique: true,
      index: true
    },
    channels: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false }
    },
    categories: {
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      vipInvitations: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true }
    }
  },
  {
    timestamps: true
  }
);

export const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);
