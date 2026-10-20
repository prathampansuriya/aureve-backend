import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: [true, 'Audit action is required.'],
      trim: true,
      index: true
    },
    entity: {
      type: String,
      required: [true, 'Target entity is required.'],
      trim: true,
      index: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target entity ID is required.'],
      index: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User who performed action is required.'],
      index: true
    },
    ipAddress: {
      type: String,
      required: [true, 'IP address is required.'],
      trim: true
    },
    userAgent: {
      type: String,
      default: ''
    },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed, default: null },
      after: { type: mongoose.Schema.Types.Mixed, default: null }
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // Immutable records
  }
);

auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
