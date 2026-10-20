import { z } from 'zod';

export const createContactInquirySchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must contain at least 2 characters.').max(100),
  email: z.string().trim().email('Please enter a valid email address.').toLowerCase(),
  phone: z.string().trim().optional().default(''),
  subject: z.string().trim().min(2, 'Subject is required.').max(150),
  preferredChannel: z.enum(['EMAIL', 'PHONE', 'WHATSAPP']).optional().default('EMAIL'),
  message: z.string().trim().min(10, 'Message must contain at least 10 characters.').max(3000)
});

export const updateContactInquirySchema = z.object({
  status: z.enum(['NEW', 'IN_REVIEW', 'CONTACTED', 'RESOLVED', 'ARCHIVED']).optional(),
  adminNotes: z.string().trim().max(2000).optional()
});

export const contactInquiryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(['ALL', 'NEW', 'IN_REVIEW', 'CONTACTED', 'RESOLVED', 'ARCHIVED']).optional().default('ALL'),
  search: z.string().trim().optional().default('')
});
