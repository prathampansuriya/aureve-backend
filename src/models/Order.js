import mongoose from 'mongoose';

const orderItemSnapshotSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required.']
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: [true, 'Product variant reference is required.']
    },
    title: {
      type: String,
      required: [true, 'Product title snapshot is required.']
    },
    sku: {
      type: String,
      required: [true, 'Variant SKU snapshot is required.']
    },
    quantity: {
      type: Number,
      required: [true, 'Item quantity is required.'],
      min: 1
    },
    unitPricePaise: {
      type: Number,
      required: [true, 'Unit price in paise is required.'],
      validate: {
        validator: Number.isInteger,
        message: 'unitPricePaise must be an integer minor unit.'
      }
    },
    makingChargesPaise: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'makingChargesPaise must be an integer minor unit.'
      }
    },
    gstPaise: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'gstPaise must be an integer minor unit.'
      }
    },
    totalPaise: {
      type: Number,
      required: [true, 'Line item total in paise is required.'],
      validate: {
        validator: Number.isInteger,
        message: 'totalPaise must be an integer minor unit.'
      }
    },
    image: {
      type: String,
      default: ''
    },
    metalSpecifications: {
      metalType: { type: String, default: '' },
      metalPurity: { type: String, default: '' },
      size: { type: String, default: '' },
      grossWeightGrams: { type: Number, default: 0 }
    },
    certificateNumber: {
      type: String,
      default: ''
    }
  },
  {
    _id: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

orderItemSnapshotSchema.virtual('lineTotalPaise').get(function () {
  return this.totalPaise || (this.unitPricePaise * (this.quantity || 1)) || 0;
});

orderItemSnapshotSchema.virtual('priceInPaise').get(function () {
  return this.unitPricePaise || 0;
});

orderItemSnapshotSchema.virtual('metalType').get(function () {
  return this.metalSpecifications?.metalType || '';
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required.'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Purchaser user reference is required.'],
      index: true
    },
    items: {
      type: [orderItemSnapshotSchema],
      validate: [val => val.length > 0, 'Order must contain at least one line item.']
    },
    shippingAddress: {
      type: Object,
      required: [true, 'Immutable shipping address snapshot is required.']
    },
    billingAddress: {
      type: Object,
      required: [true, 'Immutable billing address snapshot is required.']
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['RAZORPAY', 'COD'],
        message: 'Invalid payment method: {VALUE}.'
      },
      required: [true, 'Payment method is required.']
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
        message: 'Invalid payment status: {VALUE}.'
      },
      default: 'PENDING',
      index: true
    },
    razorpayOrderId: {
      type: String,
      default: null,
      index: true,
      sparse: true
    },
    idempotencyKey: {
      type: String,
      default: null,
      index: true,
      sparse: true
    },
    orderStatus: {
      type: String,
      enum: {
        values: [
          'PENDING',
          'PLACED',
          'CONFIRMED',
          'PROCESSING',
          'SHIPPED',
          'DISPATCHED',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'CANCELLED',
          'REFUNDED',
          'RETURN_REQUESTED',
          'RETURNED'
        ],
        message: 'Invalid order status: {VALUE}.'
      },
      default: 'PLACED',
      index: true
    },
    // Monetary breakdown in integer minor units (Paise)
    financialBreakdown: {
      subtotalPaise: {
        type: Number,
        required: true,
        validate: { validator: Number.isInteger, message: 'subtotalPaise must be an integer minor unit.' }
      },
      makingChargesPaise: {
        type: Number,
        default: 0,
        validate: { validator: Number.isInteger, message: 'makingChargesPaise must be an integer minor unit.' }
      },
      gstPaise: {
        type: Number,
        default: 0,
        validate: { validator: Number.isInteger, message: 'gstPaise must be an integer minor unit.' }
      },
      discountPaise: {
        type: Number,
        default: 0,
        validate: { validator: Number.isInteger, message: 'discountPaise must be an integer minor unit.' }
      },
      offerDiscountPaise: {
        type: Number,
        default: 0,
        validate: { validator: Number.isInteger, message: 'offerDiscountPaise must be an integer minor unit.' }
      },
      couponDiscountPaise: {
        type: Number,
        default: 0,
        validate: { validator: Number.isInteger, message: 'couponDiscountPaise must be an integer minor unit.' }
      },
      shippingFeePaise: {
        type: Number,
        default: 0,
        validate: { validator: Number.isInteger, message: 'shippingFeePaise must be an integer minor unit.' }
      },
      grandTotalPaise: {
        type: Number,
        required: true,
        validate: { validator: Number.isInteger, message: 'grandTotalPaise must be an integer minor unit.' }
      },
      totalSavingsPaise: {
        type: Number,
        default: 0,
        validate: { validator: Number.isInteger, message: 'totalSavingsPaise must be an integer minor unit.' }
      }
    },
    couponApplied: {
      code: { type: String, default: null },
      discountPaise: { type: Number, default: 0 }
    },
    appliedOffer: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', default: null },
      title: { type: String, default: null },
      slug: { type: String, default: null },
      discountType: { type: String, default: null },
      discountValue: { type: Number, default: 0 },
      discountPaise: { type: Number, default: 0 }
    },
    tracking: {
      courierName: { type: String, default: '' },
      trackingNumber: { type: String, default: '' },
      trackingUrl: { type: String, default: '' },
      estimatedDeliveryDate: { type: Date, default: null },
      statusTimeline: [
        {
          status: { type: String, required: true },
          message: { type: String, default: '' },
          timestamp: { type: Date, default: Date.now }
        }
      ]
    },
    cancellation: {
      reason: { type: String, default: null },
      requestedAt: { type: Date, default: null },
      processedAt: { type: Date, default: null },
      refundId: { type: String, default: null },
      refundAmountPaise: { type: Number, default: 0 }
    },
    giftDetails: {
      isGift: { type: Boolean, default: false },
      recipientName: { type: String, default: '' },
      message: { type: String, default: '' }
    },
    placedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

orderSchema.virtual('grandTotalPaise').get(function () {
  return this.financialBreakdown?.grandTotalPaise || 0;
});

orderSchema.virtual('totalPaise').get(function () {
  return this.financialBreakdown?.grandTotalPaise || 0;
});

orderSchema.virtual('totalAmountPaise').get(function () {
  return this.financialBreakdown?.grandTotalPaise || 0;
});

orderSchema.virtual('subtotalPaise').get(function () {
  return this.financialBreakdown?.subtotalPaise || 0;
});

orderSchema.virtual('taxPaise').get(function () {
  return this.financialBreakdown?.gstPaise || 0;
});

orderSchema.virtual('pricing').get(function () {
  if (!this.financialBreakdown) return null;
  return {
    subtotalPaise: this.financialBreakdown.subtotalPaise || 0,
    makingChargesPaise: this.financialBreakdown.makingChargesPaise || 0,
    gstPaise: this.financialBreakdown.gstPaise || 0,
    shippingFeePaise: this.financialBreakdown.shippingFeePaise || 0,
    totalDiscountPaise: this.financialBreakdown.discountPaise || 0,
    offerDiscountPaise: this.financialBreakdown.offerDiscountPaise || 0,
    couponDiscountPaise: this.financialBreakdown.couponDiscountPaise || this.couponApplied?.discountPaise || 0,
    totalSavingsPaise: this.financialBreakdown.totalSavingsPaise || this.financialBreakdown.discountPaise || 0,
    grandTotalPaise: this.financialBreakdown.grandTotalPaise || 0
  };
});

orderSchema.index({ userId: 1, placedAt: -1 });
orderSchema.index({ orderStatus: 1, placedAt: -1 });
orderSchema.index({ 'tracking.trackingNumber': 1 });

export const Order = mongoose.model('Order', orderSchema);
