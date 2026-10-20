import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const categoryImageSchema = z.object({
  url: z.string().url('A valid image URL is required.'),
  publicId: z.string().min(1, 'Cloudinary public ID is required.'),
  alt: z.string().trim().default('AUREVÉ Fine Jewellery')
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must contain at least 2 characters.').max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(slugRegex, 'Slug must be URL-safe (lowercase alphanumeric with hyphens).')
    .optional(),
  description: z.string().trim().max(1000).default(''),
  image: categoryImageSchema,
  bannerImage: categoryImageSchema.nullable().optional(),
  parentCategory: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid parent category ID.').nullable().optional(),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  metadata: z
    .object({
      metaTitle: z.string().trim().max(120).default(''),
      metaDescription: z.string().trim().max(300).default(''),
      metaKeywords: z.array(z.string().trim()).default([])
    })
    .optional()
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryParamSchema = z.object({
  idOrSlug: z.string().trim().min(1)
});

export const categoryQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
  includeArchived: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
  tree: z.enum(['true', 'false']).transform((val) => val === 'true').optional()
});
