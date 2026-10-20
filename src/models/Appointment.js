import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    clientName: {
      type: String,
      required: [true, 'Client name is required.'],
      trim: true
    },
    clientEmail: {
      type: String,
      required: [true, 'Client email is required.'],
      lowercase: true,
      trim: true
    },
    clientPhone: {
      type: String,
      required: [true, 'Client phone is required.'],
      trim: true
    },
    appointmentType: {
      type: String,
      enum: {
        values: ['IN_STORE_VIP', 'VIRTUAL_CONSULTATION'],
        message: 'Invalid appointment type: {VALUE}.'
      },
      required: [true, 'Appointment type is required.']
    },
    storeLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreLocation',
      default: null,
      index: true
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Appointment date is required.'],
      index: true
    },
    timeSlot: {
      type: String,
      required: [true, 'Appointment time slot is required.'],
      trim: true
    },
    interestCategories: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: {
        values: ['REQUESTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW', 'BLOCKED'],
        message: 'Invalid appointment status: {VALUE}.'
      },
      default: 'REQUESTED',
      index: true
    },
    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    meetingLink: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    cancellationReason: {
      type: String,
      default: ''
    },
    rescheduledFromId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

appointmentSchema.index({ scheduledDate: 1, timeSlot: 1, storeLocationId: 1 });
appointmentSchema.index({ scheduledDate: 1, timeSlot: 1, appointmentType: 1 });
appointmentSchema.index({ userId: 1, scheduledDate: -1 });
appointmentSchema.index({ status: 1, scheduledDate: 1 });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
