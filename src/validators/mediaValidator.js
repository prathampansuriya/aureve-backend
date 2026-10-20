import { z } from 'zod';

export const uploadMediaSchema = z.object({
  folder: z
    .string()
    .trim()
    .optional()
    .default('aureve/products')
    .transform((v) => v || 'aureve/products'),
  alt: z.string().trim().max(200).optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  videoType: z.enum(['PRODUCT_360', 'MODEL_WEARING', 'CRAFTING_STORY']).optional()
});

export const uploadMultipleMediaSchema = z.object({
  folder: z
    .string()
    .trim()
    .optional()
    .default('aureve/products')
    .transform((v) => v || 'aureve/products'),
  alts: z
    .union([
      z.array(z.string().trim().max(200)),
      z.string().transform((str) => (str ? str.split(',').map((s) => s.trim()) : []))
    ])
    .optional()
    .default([]),
  displayOrders: z
    .union([
      z.array(z.coerce.number().int().min(0)),
      z.string().transform((str) => (str ? str.split(',').map(Number).filter((n) => !isNaN(n)) : []))
    ])
    .optional()
    .default([])
});

export const replaceMediaSchema = z
  .object({
    oldPublicId: z.string().trim().optional(),
    publicId: z.string().trim().optional(),
    folder: z
      .string()
      .trim()
      .optional()
      .default('aureve/products')
      .transform((v) => v || 'aureve/products'),
    oldResourceType: z.enum(['image', 'video']).optional(),
    resourceType: z.enum(['image', 'video']).optional(),
    alt: z.string().trim().max(200).optional(),
    displayOrder: z.coerce.number().int().min(0).default(0)
  })
  .refine((data) => Boolean(data.oldPublicId || data.publicId), {
    message: 'Previous public ID is required for replacement (oldPublicId or publicId).'
  })
  .transform((data) => ({
    ...data,
    oldPublicId: data.oldPublicId || data.publicId,
    oldResourceType: data.oldResourceType || data.resourceType || 'image'
  }));

export const deleteMediaParamSchema = z.object({
  publicId: z.string().trim().min(1, 'Media public ID is required.')
});

export const deleteMediaQuerySchema = z.object({
  resourceType: z.enum(['image', 'video']).default('image')
});

export const batchDeleteMediaSchema = z.object({
  publicIds: z
    .array(z.string().trim().min(1))
    .min(1, 'At least one public ID must be specified for batch deletion.')
    .max(100, 'Cannot delete more than 100 media assets in a single batch.'),
  resourceType: z.enum(['image', 'video']).default('image')
});

export const uploadSignatureSchema = z.object({
  folder: z.string().trim().default('aureve/products'),
  resourceType: z.enum(['image', 'video']).default('image')
});
