import { z } from 'zod';

const postalCodeRegex = /^[1-9][0-9]{5}$/;

export const createStoreLocationSchema = z.object({
  name: z.string().trim().min(2, 'Showroom name must be at least 2 characters.').max(100),
  slug: z.string().trim().min(2).max(120).optional(),
  addressLine: z.string().trim().min(3, 'Address line is required.').max(200),
  city: z.string().trim().min(2, 'City is required.').max(50),
  state: z.string().trim().min(2, 'State is required.').max(50),
  postalCode: z.string().trim().regex(postalCodeRegex, 'PIN code must be a valid 6-digit Indian postal code.'),
  phone: z.string().trim().min(8, 'Contact phone is required.').max(20),
  email: z.string().trim().email('Invalid contact email.'),
  timezone: z.string().trim().default('Asia/Kolkata'),
  openingHours: z
    .object({
      weekdays: z.string().default('10:30 AM – 8:30 PM'),
      weekends: z.string().default('11:00 AM – 9:00 PM')
    })
    .optional(),
  coordinates: z
    .object({
      latitude: z.number().default(0),
      longitude: z.number().default(0)
    })
    .optional(),
  appointmentConfig: z
    .object({
      slotDurationMinutes: z.number().int().min(15).max(180).default(60),
      capacityPerSlot: z.number().int().min(1).max(10).default(2),
      openingHour: z.number().int().min(0).max(23).default(10),
      closingHour: z.number().int().min(0).max(23).default(20),
      leadTimeHours: z.number().int().min(0).max(48).default(2),
      cancellationLeadTimeHours: z.number().int().min(0).max(48).default(4),
      virtualEnabled: z.boolean().default(true),
      inStoreEnabled: z.boolean().default(true)
    })
    .optional(),
  vipLoungeAvailable: z.boolean().default(true),
  images: z
    .array(
      z.object({
        url: z.string().url('Invalid image URL.'),
        publicId: z.string().min(1, 'Public ID is required.')
      })
    )
    .optional()
    .default([]),
  isActive: z.boolean().default(true)
});

export const updateStoreLocationSchema = createStoreLocationSchema.partial();
