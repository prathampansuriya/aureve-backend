import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const imageSubSchema = z.object({
  url: z.string().url('A valid image URL is required.'),
  publicId: z.string().min(1, 'Cloudinary public ID is required.'),
  alt: z.string().trim().default('AUREVÉ Haute Joaillerie Collection'),
  caption: z.string().trim().default('')
});

export const createCollectionSchema = z.object({
  name: z.string().trim().min(2, 'Collection name must have at least 2 characters.').max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(slugRegex, 'Slug must be URL-safe (lowercase alphanumeric with hyphens).')
    .optional(),
  tagline: z.string().trim().max(250).default(''),
  story: z.string().trim().min(10, 'Collection story must contain at least 10 characters.'),
  bannerImage: imageSubSchema,
  thumbnailImage: imageSubSchema,
  lookbookImages: z.array(imageSubSchema).default([]),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('ACTIVE'),
  isFeatured: z.boolean().default(false),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  merchandisingMetadata: z
    .object({
      badge: z.string().trim().default(''),
      displayOrder: z.coerce.number().int().default(0),
      themeTone: z.string().trim().default('gold')
    })
    .optional()
});

export const updateCollectionSchema = createCollectionSchema.partial();

export const collectionParamSchema = z.object({
  idOrSlug: z.string().trim().min(1)
});

export const collectionQuerySchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  isFeatured: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  includeArchived: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const collectionProductAssociationSchema = z.object({
  productIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Product ObjectId.')).min(1, 'At least one productId is required.')
});
