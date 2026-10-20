import { z } from 'zod';

const indianPhoneRegex = /^[6-9]\d{9}$/;

export const createAdminUserSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required.').max(50),
  lastName: z.string().trim().min(2, 'Last name is required.').max(50),
  email: z.string().trim().email('Invalid email address.'),
  phone: z
    .string()
    .trim()
    .refine((val) => !val || indianPhoneRegex.test(val) || (val.length >= 10 && val.length <= 15), {
      message: 'Mobile number must be valid.'
    })
    .optional(),
  role: z.enum(['STAFF', 'ADMIN', 'SUPER_ADMIN'], {
    required_error: 'Role must be STAFF, ADMIN, or SUPER_ADMIN.'
  }),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password cannot exceed 128 characters.')
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'LOCKED'], {
    required_error: 'Status must be ACTIVE, SUSPENDED, or LOCKED.'
  }),
  reason: z.string().trim().max(300).optional().default('')
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'], {
    required_error: 'Role must be CUSTOMER, STAFF, ADMIN, or SUPER_ADMIN.'
  }),
  reason: z.string().trim().max(300).optional().default('')
});
