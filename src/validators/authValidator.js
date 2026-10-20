import { z } from 'zod';

const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
const indianPhoneRegex = /^[6-9]\d{9}$/;

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, 'First name must contain at least 2 characters.').max(50),
    lastName: z.string().trim().min(2, 'Last name must contain at least 2 characters.').max(50),
    email: z.string().trim().email('Please provide a valid email address.').toLowerCase(),
    phone: z.string().trim().regex(indianPhoneRegex, 'Please provide a valid 10-digit Indian mobile number.').optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .regex(
        passwordComplexityRegex,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      ),
    // Role is strictly locked to CUSTOMER
    role: z.literal('CUSTOMER').optional()
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email('Please provide a valid email address.').toLowerCase(),
    password: z.string().min(1, 'Password is required.')
  })
  .strict();

export const verifyOtpSchema = z
  .object({
    email: z.string().trim().email('Please provide a valid email address.').toLowerCase(),
    otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be an exact 6-digit numeric code.'),
    purpose: z
      .enum(['ACCOUNT_ACTIVATION', 'PASSWORD_RESET', 'HIGH_VALUE_ORDER', 'LOGIN_VERIFICATION', 'EMAIL_CHANGE'])
      .default('ACCOUNT_ACTIVATION')
  })
  .strict();

export const resendOtpSchema = z
  .object({
    email: z.string().trim().email('Please provide a valid email address.').toLowerCase(),
    purpose: z
      .enum(['ACCOUNT_ACTIVATION', 'PASSWORD_RESET', 'HIGH_VALUE_ORDER', 'LOGIN_VERIFICATION', 'EMAIL_CHANGE'])
      .default('ACCOUNT_ACTIVATION')
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email('Please provide a valid email address.').toLowerCase()
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email('Please provide a valid email address.').toLowerCase(),
    token: z.string().trim().min(10, 'Reset token is missing or invalid.'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .regex(
        passwordComplexityRegex,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      )
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long.')
      .regex(
        passwordComplexityRegex,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      )
  })
  .strict();

export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(2, 'First name must contain at least 2 characters.').max(50).optional(),
    lastName: z.string().trim().min(2, 'Last name must contain at least 2 characters.').max(50).optional(),
    phone: z.string().trim().regex(indianPhoneRegex, 'Please provide a valid 10-digit Indian mobile number.').optional(),
    preferences: z
      .object({
        ringSize: z.number().min(6).max(30).optional(),
        bangleSize: z.string().trim().optional(),
        newsletter: z.boolean().optional(),
        smsAlerts: z.boolean().optional(),
        whatsappAlerts: z.boolean().optional()
      })
      .optional()
  })
  .strict();

export const requestEmailChangeSchema = z
  .object({
    newEmail: z.string().trim().email('Please provide a valid email address.').toLowerCase(),
    password: z.string().min(1, 'Current password is required to verify your identity.')
  })
  .strict();

export const verifyEmailChangeSchema = z
  .object({
    newEmail: z.string().trim().email('Please provide a valid email address.').toLowerCase(),
    otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be an exact 6-digit numeric code.')
  })
  .strict();
