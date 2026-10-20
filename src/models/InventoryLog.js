import mongoose from 'mongoose';

const inventoryLogSchema = new mongoose.Schema(
  {
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: [true, 'Variant reference is required.'],
      index: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required.'],
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true
    },
    movementType: {
      type: String,
      enum: {
        values: [
          'INITIAL_STOCK',
          'PURCHASE_DEDUCTION',
          'ORDER_CANCELLATION_RESTITUTION',
          'ADMIN_ADJUSTMENT',
          'CHECKOUT_RESERVATION',
          'RESERVATION_EXPIRY'
        ],
        message: 'Invalid inventory movement type: {VALUE}.'
      },
      required: [true, 'Movement type is required.'],
      index: true
    },
    quantityChanged: {
      type: Number,
      required: [true, 'Quantity changed is required.']
    },
    previousQuantity: {
      type: Number,
      required: [true, 'Previous inventory count is required.'],
      min: 0
    },
    newQuantity: {
      type: Number,
      required: [true, 'New inventory count is required.'],
      min: 0
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // Immutable logs
  }
);

inventoryLogSchema.index({ variantId: 1, createdAt: -1 });

export const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);
