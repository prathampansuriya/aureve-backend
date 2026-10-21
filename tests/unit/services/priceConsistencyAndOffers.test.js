import { describe, it, expect } from 'vitest';
import {
  paiseToRupees,
  rupeesToPaise,
  calculateProductPricing,
  isOfferApplicableToProduct,
  getBestOfferForProduct,
  enrichProductWithPricingAndOffers
} from '../../../src/utils/pricingHelper.js';

describe('AUREVÉ Product Pricing, Financial Valuation & Offer Engine Suite', () => {
  // Mock fixture: The Astral Solitaire Floating Pendant
  const astralSolitaireProduct = {
    _id: '671234567890abcdef123456',
    title: 'The Astral Solitaire Floating Pendant',
    slug: 'astral-solitaire-floating-pendant',
    sku: 'AV-PEND-001',
    category: '671234567890abcdef000001',
    collections: ['671234567890abcdef000002'],
    pricing: {
      baseMetalPricePaise: 18000000, // ₹1,80,000 (Metal bullion only)
      diamondStonePricePaise: 65000000, // ₹6,50,000 (1.5ct Solitaire)
      makingChargesPaise: 7000000, // ₹70,000 (Karigar crafting)
      discountPricePaise: null,
      calculatedPricePaise: 90000000
    },
    variants: [
      {
        _id: '671234567890abcdefv00001',
        sku: 'AV-PEND-001-V1',
        variantName: '16-Inch Length',
        size: '16-Inch',
        priceInPaise: 90000000, // ₹9,00,000
        discountPriceInPaise: null,
        isActive: true,
        inventoryCount: 4
      },
      {
        _id: '671234567890abcdefv00002',
        sku: 'AV-PEND-001-V2',
        variantName: '18-Inch Length',
        size: '18-Inch',
        priceInPaise: 92000000, // ₹9,20,000
        discountPriceInPaise: null,
        isActive: true,
        inventoryCount: 2
      }
    ]
  };

  describe('1. Paise and Rupee Exact Financial Conversion & Valuation', () => {
    it('accurately converts paise to rupees without floating-point error', () => {
      expect(paiseToRupees(100000)).toBe(1000); // 1,00,000 paise = ₹1,000
      expect(paiseToRupees(18000000)).toBe(180000); // ₹1,80,000
      expect(paiseToRupees(90000000)).toBe(900000); // ₹9,00,000
      expect(paiseToRupees(92000000)).toBe(920000); // ₹9,20,000
      expect(paiseToRupees(0)).toBe(0);
    });

    it('accurately converts rupees to integer minor units (paise)', () => {
      expect(rupeesToPaise(1000)).toBe(100000);
      expect(rupeesToPaise(180000)).toBe(18000000);
      expect(rupeesToPaise(900000)).toBe(90000000);
      expect(rupeesToPaise(920000)).toBe(92000000);
      expect(Number.isInteger(rupeesToPaise(900000))).toBe(true);
    });
  });

  describe('2. Root Cause Verification: The Astral Solitaire Floating Pendant', () => {
    it('calculates the true product price from components when no variants exist', () => {
      const productNoVariants = {
        ...astralSolitaireProduct,
        variants: []
      };
      const pricing = calculateProductPricing(productNoVariants);

      // Component sum: 1,80,000 + 6,50,000 + 70,000 = ₹9,00,000
      expect(pricing.pricePaise).toBe(90000000);
      expect(pricing.priceRupees).toBe(900000);
      expect(pricing.hasPriceRange).toBe(false);
    });

    it('identifies the variant price range (₹9,00,000 to ₹9,20,000) for catalog cards', () => {
      const pricing = calculateProductPricing(astralSolitaireProduct);

      // Card must display starting price ₹9,00,000 and price range flag
      expect(pricing.minPricePaise).toBe(90000000);
      expect(pricing.maxPricePaise).toBe(92000000);
      expect(pricing.minPriceRupees).toBe(900000);
      expect(pricing.maxPriceRupees).toBe(920000);
      expect(pricing.hasPriceRange).toBe(true);
      expect(pricing.pricePaise).toBe(90000000); // Starting price
    });

    it('never reports ₹1,80,000 (metal cost only) as the complete selling price', () => {
      const pricing = calculateProductPricing(astralSolitaireProduct);
      expect(pricing.pricePaise).not.toBe(18000000);
      expect(pricing.minPricePaise).not.toBe(18000000);
      expect(pricing.priceRupees).not.toBe(180000);
    });
  });

  describe('3. Promotional Offer Engine & Eligibility Matching', () => {
    const activeOffers = [
      {
        _id: '671234567890offer00001',
        title: 'Diwali Radiance Privilege',
        slug: 'diwali-radiance-2026',
        discountType: 'PERCENTAGE',
        discountValue: 12, // 12%
        offerType: 'FESTIVAL',
        applicableCategories: ['671234567890abcdef000001'], // Matches product's category
        applicableCollections: [],
        applicableProducts: [],
        minOrderValuePaise: 5000000, // ₹50,000
        maxDiscountPaise: 3000000, // ₹30,000 cap
        priority: 10,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000 * 30),
        isActive: true
      },
      {
        _id: '671234567890offer00002',
        title: 'Expired Clearance Offer',
        slug: 'expired-offer-2025',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        offerType: 'STOREWIDE',
        priority: 100, // Higher priority but expired
        startDate: new Date(Date.now() - 86400000 * 60),
        endDate: new Date(Date.now() - 86400000 * 10),
        isActive: true
      },
      {
        _id: '671234567890offer00003',
        title: 'Paused Masterpiece Offer',
        slug: 'paused-offer',
        discountType: 'PERCENTAGE',
        discountValue: 25,
        offerType: 'STOREWIDE',
        priority: 50,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000 * 10),
        isActive: false // Deactivated by admin
      }
    ];

    it('authenticates valid offer and rejects expired or inactive offers', () => {
      const now = new Date();
      expect(isOfferApplicableToProduct(activeOffers[0], astralSolitaireProduct, now)).toBe(true);
      expect(isOfferApplicableToProduct(activeOffers[1], astralSolitaireProduct, now)).toBe(false); // Expired
      expect(isOfferApplicableToProduct(activeOffers[2], astralSolitaireProduct, now)).toBe(false); // Inactive
    });

    it('selects the highest priority eligible active offer for a product', () => {
      const bestOffer = getBestOfferForProduct(astralSolitaireProduct, activeOffers);
      expect(bestOffer).not.toBeNull();
      expect(bestOffer.title).toBe('Diwali Radiance Privilege');
      expect(bestOffer.discountValue).toBe(12);
      expect(bestOffer.badgeText).toBe('12% OFF');
    });

    it('enriches product document with calculated pricing and applicable offer', () => {
      const enriched = enrichProductWithPricingAndOffers(astralSolitaireProduct, activeOffers);
      expect(enriched.pricePaise).toBe(90000000);
      expect(enriched.hasPriceRange).toBe(true);
      expect(enriched.applicableOffer).not.toBeNull();
      expect(enriched.applicableOffer.title).toBe('Diwali Radiance Privilege');
      expect(enriched.applicableOffer.badgeText).toBe('12% OFF');
    });
  });
});
