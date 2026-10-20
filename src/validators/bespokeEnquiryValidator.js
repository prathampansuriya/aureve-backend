import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const indianPhoneRegex = /^[6-9]\d{9}$/;

export const createBespokeEnquirySchema = z.object({
  clientName: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(100),
  clientEmail: z.string().trim().email('Please enter a valid email address.').toLowerCase(),
  clientPhone: z
    .string()
    .trim()
    .refine((val) => indianPhoneRegex.test(val) || (val.length >= 10 && val.length <= 15), {
      message: 'Mobile number must be at least 10 valid digits.'
    }),
  pieceType: z.string().trim().min(2, 'Please specify the jewellery piece type.'),
  metalPreference: z.string().trim().optional().default(''),
  gemstonePreference: z.string().trim().optional().default(''),
  budgetTier: z.string().trim().optional().default(''),
  consultationMode: z.enum(['IN_STORE_VIP', 'VIRTUAL_CONSULTATION']).optional().default('IN_STORE_VIP'),
  visionNotes: z.string().trim().max(2000, 'Vision notes cannot exceed 2000 characters.').optional().default(''),
  preferredDate: z.string().optional().nullable()
});

export const updateBespokeEnquirySchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).optional(),
  adminNotes: z.string().trim().max(1000).optional(),
  assignedTo: z.string().regex(objectIdRegex, 'Invalid staff ID.').optional().nullable()
});

export const enquiryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['ALL', 'NEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).optional().default('ALL'),
  search: z.string().trim().optional().default('')
});
