import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const indianPhoneRegex = /^[6-9]\d{9}$/;

export const availabilityQuerySchema = z.object({
  date: z.string({ required_error: 'Appointment date is required.' }),
  storeLocationId: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || objectIdRegex.test(val), {
      message: 'Invalid showroom ID.'
    })
    .transform((val) => val || undefined),
  appointmentType: z.enum(['IN_STORE_VIP', 'VIRTUAL_CONSULTATION']).default('IN_STORE_VIP')
});

export const bookAppointmentSchema = z.object({
  clientName: z.string().trim().min(2, 'Client name must be at least 2 characters.').max(100),
  clientEmail: z.string().trim().email('Invalid email address.'),
  clientPhone: z
    .string()
    .trim()
    .refine((val) => indianPhoneRegex.test(val) || (val.length >= 10 && val.length <= 15), {
      message: 'Mobile number must be a valid 10-digit number.'
    }),
  appointmentType: z.enum(['IN_STORE_VIP', 'VIRTUAL_CONSULTATION'], {
    required_error: 'Appointment type is required (IN_STORE_VIP or VIRTUAL_CONSULTATION).'
  }),
  storeLocationId: z.string().regex(objectIdRegex, 'Valid showroom ID is required.').optional().nullable(),
  scheduledDate: z.string({ required_error: 'Scheduled date is required.' }),
  timeSlot: z.string().trim().min(3, 'Time slot is required.').max(50),
  interestCategories: z.array(z.string().trim()).optional().default([]),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters.').optional().default(''),
  idempotencyKey: z.string().trim().max(100).optional()
});

export const rescheduleAppointmentSchema = z.object({
  scheduledDate: z.string({ required_error: 'New scheduled date is required.' }),
  timeSlot: z.string().trim().min(3, 'New time slot is required.').max(50),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters.').optional()
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().max(500, 'Cancellation reason cannot exceed 500 characters.').optional()
});

export const adminUpdateAppointmentSchema = z.object({
  status: z.enum(['CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW']).optional(),
  assignedStaffId: z.string().regex(objectIdRegex, 'Invalid staff ID.').optional().nullable(),
  meetingLink: z.string().trim().url('Invalid meeting URL format.').optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional()
});

export const adminBlockSlotSchema = z.object({
  storeLocationId: z.string().regex(objectIdRegex, 'Invalid showroom ID.').optional().nullable(),
  appointmentType: z.enum(['IN_STORE_VIP', 'VIRTUAL_CONSULTATION']).default('IN_STORE_VIP'),
  scheduledDate: z.string({ required_error: 'Scheduled date is required.' }),
  timeSlot: z.string().trim().min(3, 'Time slot is required.').max(50),
  notes: z.string().trim().max(300).optional().default('')
});
