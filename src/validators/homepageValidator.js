import { z } from 'zod';

const bannerMediaSchema = z.object({
  url: z.string().url('A valid media URL is required.'),
  publicId: z.string().min(1, 'Cloudinary public ID is required.')
});

export const createBannerSchema = z.object({
  key: z.string().trim().toUpperCase().min(2, 'Banner key must have at least 2 characters.'),
  title: z.string().trim().min(2, 'Banner title is required.'),
  subtitle: z.string().trim().default(''),
  ctaText: z.string().trim().default('Discover the Masterpiece'),
  linkUrl: z.string().trim().default('/collections'),
  placement: z.enum([
    'HERO_CAROUSEL',
    'EDITORIAL_SPOTLIGHT',
    'PROMOTIONAL_STRIP',
    'CATEGORY_BILLBOARD',
    'HERITAGE_BANNER'
  ]),
  desktopMedia: bannerMediaSchema,
  mobileMedia: bannerMediaSchema.nullable().optional(),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  schedule: z
    .object({
      startAt: z.coerce.date().nullable().optional(),
      endAt: z.coerce.date().nullable().optional()
    })
    .optional()
});

export const updateBannerSchema = createBannerSchema.partial();

export const bannerParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid banner ID.')
});

export const createSectionSchema = z.object({
  key: z.string().trim().toUpperCase().min(2, 'Section key must have at least 2 characters.'),
  title: z.string().trim().min(2, 'Section title is required.'),
  subtitle: z.string().trim().default(''),
  sectionType: z.enum(['CAROUSEL', 'GRID', 'EDITORIAL_FEATURE', 'SPLIT_BANNER', 'LOOKBOOK_FEED']),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  targetCategory: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID.').nullable().optional(),
  targetCollection: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid collection ID.').nullable().optional(),
  curatedProductIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID.')).default([]),
  settings: z
    .object({
      autoplay: z.boolean().default(true),
      intervalSeconds: z.coerce.number().int().min(1).default(5),
      itemsPerRow: z.coerce.number().int().min(1).max(6).default(4),
      backgroundTone: z.string().trim().default('ivory')
    })
    .optional()
});

export const updateSectionSchema = createSectionSchema.partial();

export const sectionParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid section ID.')
});
