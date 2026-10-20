import { z } from 'zod';

export const pageKeyParamSchema = z.object({
  pageKey: z.enum(['OUR_STORY', 'BESPOKE_SERVICES', 'TERMS_OF_SERVICE', 'PRIVACY_POLICY'], {
    required_error: 'Page key is required (OUR_STORY, BESPOKE_SERVICES, TERMS_OF_SERVICE, or PRIVACY_POLICY).'
  })
});

const pageSectionSchema = z.object({
  _id: z.string().optional(),
  sectionKey: z.string().trim().min(2, 'Section key must be at least 2 characters.'),
  title: z.string().trim().min(2, 'Section title is required.'),
  subtitle: z.string().trim().optional().default(''),
  description: z.string().trim().optional().default(''),
  mediaUrl: z.string().trim().optional().default(''),
  mediaType: z.enum(['IMAGE', 'VIDEO']).optional().default('IMAGE'),
  items: z.array(z.any()).optional().default([]),
  displayOrder: z.coerce.number().optional().default(0),
  isPublished: z.boolean().optional().default(true)
});

export const updatePageContentSchema = z.object({
  title: z.string().trim().min(2, 'Page title must be at least 2 characters.').optional(),
  subtitle: z.string().trim().optional(),
  heroDescription: z.string().trim().optional(),
  heroMedia: z
    .object({
      url: z.string().trim().optional().default(''),
      publicId: z.string().trim().optional().default(''),
      mediaType: z.enum(['IMAGE', 'VIDEO']).optional().default('IMAGE'),
      alt: z.string().trim().optional().default('')
    })
    .optional(),
  sections: z.array(pageSectionSchema).optional(),
  cta: z
    .object({
      title: z.string().trim().optional(),
      subtitle: z.string().trim().optional(),
      buttonText: z.string().trim().optional(),
      buttonLink: z.string().trim().optional()
    })
    .optional(),
  seo: z
    .object({
      metaTitle: z.string().trim().optional(),
      metaDescription: z.string().trim().optional()
    })
    .optional(),
  isPublished: z.boolean().optional()
});
