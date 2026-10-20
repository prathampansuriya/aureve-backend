import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const productImageSchema = z.object({
  _id: z.string().optional(),
  url: z.string().url('A valid image URL is required.'),
  publicId: z.string().min(1, 'Cloudinary public ID is required.'),
  alt: z.string().trim().default('AUREVÉ Fine Jewellery Piece'),
  isPrimary: z.boolean().default(false),
  displayOrder: z.coerce.number().int().default(0)
});

const productVideoSchema = z.object({
  _id: z.string().optional(),
  url: z.string().url('A valid video URL is required.'),
  publicId: z.string().min(1, 'Cloudinary public ID is required.'),
  videoType: z.enum(['PRODUCT_360', 'MODEL_WEARING', 'CRAFTING_STORY']).default('PRODUCT_360'),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3']).default('16:9').optional(),
  durationSeconds: z.coerce.number().min(0).default(0),
  thumbnail: z.string().default('')
});

const hallmarkingSchema = z.object({
  bisHallmarked: z.boolean().default(true),
  huidNumber: z.string().trim().default(''),
  certification: z.enum(['GIA', 'IGI', 'SGL', 'BIS_GOVT', 'IN_HOUSE']).default('BIS_GOVT'),
  certificateNumber: z.string().trim().default('')
});

const diamondDetailsSchema = z.object({
  caratWeight: z.coerce.number().min(0).default(0),
  clarity: z.string().trim().default('VVS-VS'),
  colorGrade: z.string().trim().default('G-H'),
  cutGrade: z.string().trim().default('Excellent')
});

const materialOverviewSchema = z.object({
  primaryMetal: z.enum(['YELLOW_GOLD', 'ROSE_GOLD', 'WHITE_GOLD', 'PLATINUM']).default('YELLOW_GOLD'),
  primaryPurity: z.enum(['14K', '18K', '22K', '24K', '950_PLAT']).default('18K'),
  hasDiamonds: z.boolean().default(false),
  diamondDetails: diamondDetailsSchema.optional(),
  hasGemstones: z.boolean().default(false),
  gemstoneTypes: z.array(z.string().trim()).default([])
});

const pricingSchema = z.object({
  baseMetalPricePaise: z.coerce.number().int().min(0, 'Base metal price cannot be negative.'),
  diamondStonePricePaise: z.coerce.number().int().min(0).default(0),
  makingChargesPaise: z.coerce.number().int().min(0).default(0),
  discountPricePaise: z.coerce.number().int().min(0).nullable().optional(),
  gstRate: z.coerce.number().min(0).max(28).default(3)
});

const limitedEditionDetailsSchema = z.object({
  editionName: z.string().trim().default(''),
  totalEditionQuantity: z.coerce.number().int().min(0).default(0),
  remainingStock: z.coerce.number().int().min(0).default(0),
  availabilityWindow: z
    .object({
      startAt: z.coerce.date().nullable().optional(),
      endAt: z.coerce.date().nullable().optional()
    })
    .optional(),
  exclusiveLabel: z.string().trim().default('Limited Masterpiece')
});

export const createProductSchema = z.object({
  title: z.string().trim().min(3, 'Title must contain at least 3 characters.').max(180),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(slugRegex, 'Slug must be URL-safe.')
    .optional(),
  sku: z.string().trim().toUpperCase().min(3, 'Master SKU must have at least 3 characters.'),
  subtitle: z.string().trim().max(250).default(''),
  shortDescription: z.string().trim().default(''),
  description: z.string().trim().min(10, 'Detailed description is required.'),
  story: z.string().trim().default(''),
  careInstructions: z.string().trim().default('Store in AUREVÉ velvet box. Avoid direct contact with perfumes, moisture, and harsh chemicals. Clean with a soft lint-free chamois cloth.'),
  materialInformation: z.string().trim().default(''),
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID.'),
  collectionIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid collection ID.')).default([]),
  tags: z.array(z.string().trim()).default([]),
  gender: z.enum(['WOMEN', 'MEN', 'UNISEX']).default('WOMEN'),
  occasion: z.enum(['BRIDAL', 'EVERYDAY_LUXURY', 'COCKTAIL', 'HERITAGE']).default('BRIDAL'),
  availability: z.enum(['IN_STOCK', 'MADE_TO_ORDER', 'OUT_OF_STOCK']).default('IN_STOCK'),
  hallmarking: hallmarkingSchema.optional(),
  materialOverview: materialOverviewSchema.optional(),
  pricing: pricingSchema,
  isNewArrival: z.boolean().default(true),
  isBestseller: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isLimitedEdition: z.boolean().default(false),
  limitedEditionDetails: limitedEditionDetailsSchema.optional(),
  images: z.array(productImageSchema).min(1, 'At least one showcase image is required.'),
  videos: z.array(productVideoSchema).default([]),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  seoMetadata: z
    .object({
      metaTitle: z.string().trim().default(''),
      metaDescription: z.string().trim().default(''),
      metaKeywords: z.array(z.string().trim()).default([])
    })
    .optional()
});

export const updateProductSchema = createProductSchema.partial().extend({
  isAuthorizedEditionExpansion: z.boolean().optional()
});

export const updateMediaSchema = z.object({
  images: z.array(productImageSchema).min(1, 'At least one image is required.').optional(),
  videos: z.array(productVideoSchema).optional()
});

export const productParamSchema = z.object({
  idOrSlug: z.string().trim().min(1)
});

export const createVariantSchema = z.object({
  variantName: z.string().trim().min(2, 'Variant name is required.'),
  sku: z.string().trim().toUpperCase().min(3, 'Variant SKU must have at least 3 characters.'),
  metalType: z.enum(['YELLOW_GOLD', 'ROSE_GOLD', 'WHITE_GOLD', 'PLATINUM']),
  metalPurity: z.enum(['14K', '18K', '22K', '24K', '950_PLAT']),
  size: z.string().trim().min(1, 'Jewellery size/length specification is required.'),
  grossWeightGrams: z.coerce.number().min(0.01, 'Gross weight must be greater than zero.'),
  netGoldWeightGrams: z.coerce.number().min(0.01, 'Net weight must be greater than zero.'),
  diamondWeightCarat: z.coerce.number().min(0).default(0),
  gemstoneSpecifications: z
    .object({
      stoneType: z.string().trim().default(''),
      count: z.coerce.number().int().min(0).default(0),
      weightCarat: z.coerce.number().min(0).default(0),
      cut: z.string().trim().default('')
    })
    .optional(),
  priceInPaise: z.coerce.number().int().min(0, 'Price in paise must be a non-negative integer.'),
  discountPriceInPaise: z.coerce.number().int().min(0).nullable().optional(),
  inventoryCount: z.coerce.number().int().min(0).default(1),
  availability: z.enum(['AVAILABLE', 'MADE_TO_ORDER', 'DEPLETED']).default('AVAILABLE'),
  variantSpecificMedia: z
    .array(
      z.object({
        url: z.string().url(),
        publicId: z.string().min(1),
        alt: z.string().trim().default('AUREVÉ Variant Showcase')
      })
    )
    .default([]),
  isActive: z.boolean().default(true)
});

export const updateVariantSchema = createVariantSchema.partial();

export const variantParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid variant ID.')
});

export const stockAdjustmentSchema = z.object({
  adjustment: z.coerce.number().int().refine((val) => val !== 0, 'Adjustment cannot be zero.'),
  reason: z.string().trim().min(3, 'Audit reason is required for stock adjustments.')
});

export const stockReservationSchema = z.object({
  quantity: z.coerce.number().int().min(1, 'Reservation quantity must be at least 1.')
});

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().optional(),
  collection: z.string().trim().optional(),
  minPricePaise: z.coerce.number().int().min(0).optional(),
  maxPricePaise: z.coerce.number().int().min(0).optional(),
  metal: z.enum(['YELLOW_GOLD', 'ROSE_GOLD', 'WHITE_GOLD', 'PLATINUM']).optional(),
  purity: z.enum(['14K', '18K', '22K', '24K', '950_PLAT']).optional(),
  gender: z.enum(['WOMEN', 'MEN', 'UNISEX']).optional(),
  occasion: z.enum(['BRIDAL', 'EVERYDAY_LUXURY', 'COCKTAIL', 'HERITAGE']).optional(),
  availability: z.enum(['IN_STOCK', 'MADE_TO_ORDER', 'OUT_OF_STOCK']).optional(),
  isNewArrival: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  isBestseller: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  isFeatured: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'rating', 'popularity', 'relevance']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20)
});
