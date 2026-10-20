import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// ==========================================
// WISHLIST VALIDATORS
// ==========================================

export const addToWishlistSchema = z.object({
  productId: z.string().regex(objectIdRegex, 'Invalid product ID.'),
  variantId: z.string().regex(objectIdRegex, 'Invalid variant ID.').nullable().optional()
});

export const moveToCartSchema = z.object({
  productId: z.string().regex(objectIdRegex, 'Invalid product ID.'),
  variantId: z.string().regex(objectIdRegex, 'Invalid variant ID.'),
  quantity: z.coerce.number().int().min(1).max(5).default(1)
});

// ==========================================
// CART VALIDATORS
// ==========================================

export const addToCartSchema = z
  .object({
    variantId: z.string().regex(objectIdRegex, 'Invalid variant ID.').optional().nullable(),
    productId: z.string().regex(objectIdRegex, 'Invalid product ID.').optional().nullable(),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.').max(5, 'Maximum of 5 units allowed per high-value creation.').default(1)
  })
  .refine((data) => data.variantId || data.productId, {
    message: 'Either variantId or productId is required to add item to bag.'
  });

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.').max(5, 'Maximum of 5 units allowed per high-value creation.')
});

export const applyCouponSchema = z.object({
  code: z.string().trim().min(2, 'Coupon code is required.').toUpperCase()
});

export const mergeCartSchema = z.object({
  guestToken: z.string().trim().min(8, 'Valid guest token is required.')
});

// ==========================================
// COUPON VALIDATORS
// ==========================================

const couponBaseSchema = z.object({
  code: z.string().trim().toUpperCase().min(3, 'Coupon code must be at least 3 characters.').max(30),
  description: z.string().trim().min(5, 'Coupon description is required.'),
  discountType: z.enum(['PERCENTAGE', 'FLAT_PAISE']),
  discountValue: z.coerce.number().min(1, 'Discount value must be at least 1.'),
  minOrderValuePaise: z.coerce.number().int().min(0).default(0),
  maxDiscountLimitPaise: z.coerce.number().int().min(0).nullable().optional(),
  usageLimitTotal: z.coerce.number().int().min(1).nullable().optional(),
  usageLimitPerUser: z.coerce.number().int().min(1).default(1),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
  applicableProducts: z.array(z.string().regex(objectIdRegex, 'Invalid product ID.')).default([]),
  applicableCategories: z.array(z.string().regex(objectIdRegex, 'Invalid category ID.')).default([]),
  applicableCollections: z.array(z.string().regex(objectIdRegex, 'Invalid collection ID.')).default([]),
  isActive: z.boolean().default(true)
});

export const createCouponSchema = couponBaseSchema
  .refine((data) => data.validUntil > data.validFrom, {
    message: 'validUntil date must be after validFrom date.',
    path: ['validUntil']
  })
  .refine((data) => {
    if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
      return false;
    }
    return true;
  }, {
    message: 'Percentage discount cannot exceed 100%.',
    path: ['discountValue']
  });

export const updateCouponSchema = couponBaseSchema.partial();

export const validateCouponSchema = z.object({
  code: z.string().trim().toUpperCase().min(2, 'Coupon code is required.'),
  cartSubtotalPaise: z.coerce.number().int().min(0).optional(),
  items: z.array(
    z.object({
      productId: z.string().regex(objectIdRegex),
      variantId: z.string().regex(objectIdRegex),
      quantity: z.coerce.number().int().min(1),
      priceInPaise: z.coerce.number().int().min(0)
    })
  ).optional()
});

// ==========================================
// OFFER VALIDATORS
// ==========================================

const offerBaseSchema = z.object({
  title: z.string().trim().min(3, 'Offer title is required.').max(100),
  slug: z.string().trim().toLowerCase().optional(),
  description: z.string().trim().default(''),
  discountType: z.enum(['PERCENTAGE', 'FLAT_PAISE']),
  discountValue: z.coerce.number().min(1, 'Discount value must be at least 1.'),
  offerType: z.enum(['FESTIVAL', 'COLLECTION', 'PRODUCT', 'STOREWIDE']).default('FESTIVAL'),
  applicableProducts: z.array(z.string().regex(objectIdRegex)).default([]),
  applicableCategories: z.array(z.string().regex(objectIdRegex)).default([]),
  applicableCollections: z.array(z.string().regex(objectIdRegex)).default([]),
  minOrderValuePaise: z.coerce.number().int().min(0).default(0),
  maxDiscountPaise: z.coerce.number().int().min(0).nullable().optional(),
  priority: z.coerce.number().int().default(0),
  allowStackingWithCoupons: z.boolean().default(false),
  bannerUrl: z.string().trim().default(''),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().default(true)
});

export const createOfferSchema = offerBaseSchema
  .refine((data) => data.endDate > data.startDate, {
    message: 'endDate must be after startDate.',
    path: ['endDate']
  })
  .refine((data) => {
    if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
      return false;
    }
    return true;
  }, {
    message: 'Percentage discount cannot exceed 100%.',
    path: ['discountValue']
  });

export const updateOfferSchema = offerBaseSchema.partial();

export const commerceParamSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid ObjectId parameter.')
});
