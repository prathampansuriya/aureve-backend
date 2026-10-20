import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required.'],
      index: true
    },
    transactionId: {
      type: String,
      required: [true, 'Transaction identifier is required.'],
      unique: true,
      index: true
    },
    razorpayOrderId: {
      type: String,
      default: null,
      index: true
    },
    razorpaySignature: {
      type: String,
      default: null
    },
    gateway: {
      type: String,
      enum: {
        values: ['RAZORPAY', 'COD'],
        message: 'Invalid payment gateway: {VALUE}.'
      },
      required: [true, 'Payment gateway is required.']
    },
    amountPaise: {
      type: Number,
      required: [true, 'Payment amount in paise is required.'],
      validate: {
        validator: Number.isInteger,
        message: 'amountPaise must be an integer minor unit.'
      }
    },
    currency: {
      type: String,
      default: 'INR'
    },
    method: {
      type: String,
      enum: {
        values: ['UPI', 'CARD', 'NETBANKING', 'WALLET', 'COD'],
        message: 'Invalid payment method: {VALUE}.'
      },
      default: 'UPI'
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'CAPTURED', 'FAILED', 'REFUNDED'],
        message: 'Invalid payment status: {VALUE}.'
      },
      default: 'PENDING',
      index: true
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      select: false // Concealed from regular queries to prevent data leaks
    },
    refundDetails: {
      refundId: { type: String, default: null },
      amountPaise: { type: Number, default: 0 },
      refundedAt: { type: Date, default: null },
      reason: { type: String, default: null }
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ orderId: 1, status: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
