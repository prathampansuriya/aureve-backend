import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createReviewSchema = z.object({
  productId: z.string().regex(objectIdRegex, 'Valid product ID is required.'),
  rating: z.coerce.number().int().min(1, 'Rating must be at least 1 star.').max(5, 'Rating cannot exceed 5 stars.'),
  title: z.string().trim().min(2, 'Review title must be at least 2 characters.').max(120),
  comment: z.string().trim().min(10, 'Review comment must be at least 10 characters.').max(1500),
  images: z
    .array(
      z.object({
        url: z.string().url('Invalid image URL.'),
        publicId: z.string().min(1, 'Public ID is required.')
      })
    )
    .optional()
    .default([])
});

export const moderateReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    required_error: 'Moderation status is required (APPROVED or REJECTED).'
  }),
  moderatorNotes: z.string().trim().max(500, 'Moderator notes cannot exceed 500 characters.').optional().default('')
});
