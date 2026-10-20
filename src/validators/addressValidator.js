import { z } from 'zod';

const phoneRegex = /^[6-9]\d{9}$/;
const pinCodeRegex = /^[1-9][0-9]{5}$/;

export const createAddressSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(100, 'Full name cannot exceed 100 characters.'),
  phone: z.string().trim().regex(phoneRegex, 'Please provide a valid 10-digit Indian mobile number starting with 6-9.'),
  alternatePhone: z.string().trim().optional().or(z.literal('')),
  addressLine1: z.string().trim().min(3, 'Address line 1 must be at least 3 characters.').max(150, 'Address line 1 cannot exceed 150 characters.'),
  addressLine2: z.string().trim().max(150, 'Address line 2 cannot exceed 150 characters.').optional().or(z.literal('')),
  landmark: z.string().trim().max(100, 'Landmark cannot exceed 100 characters.').optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required.').max(100),
  state: z.string().trim().min(2, 'State / Union Territory is required.').max(100),
  postalCode: z.string().trim().regex(pinCodeRegex, 'Please provide a valid 6-digit Indian PIN code.'),
  country: z.string().trim().default('India'),
  addressType: z.enum(['HOME', 'WORK', 'OTHER']).default('HOME'),
  isDefaultShipping: z.boolean().optional().default(false),
  isDefaultBilling: z.boolean().optional().default(false)
});

export const updateAddressSchema = createAddressSchema.partial();
