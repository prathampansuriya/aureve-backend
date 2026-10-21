import mongoose from 'mongoose';
import { Banner } from '../models/Banner.js';
import { HomepageSection } from '../models/HomepageSection.js';
import { Category } from '../models/Category.js';
import { Collection } from '../models/Collection.js';
import { Product } from '../models/Product.js';
import { Offer } from '../models/Offer.js';
import { StoreLocation } from '../models/StoreLocation.js';
import { productService } from './productService.js';
import { enrichProductWithPricingAndOffers } from '../utils/pricingHelper.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/AppError.js';

export const homepageService = {
  /**
   * Assemble complete dynamic homepage feed for public clients.
   * Only active, published database records within valid date schedules are returned.
   */
  async getPublicHomepage() {
    const now = new Date();

    const bannerScheduleFilter = {
      isActive: true,
      $and: [
        {
          $or: [
            { 'schedule.startAt': null },
            { 'schedule.startAt': { $exists: false } },
            { 'schedule.startAt': { $lte: now } }
          ]
        },
        {
          $or: [
            { 'schedule.endAt': null },
            { 'schedule.endAt': { $exists: false } },
            { 'schedule.endAt': { $gte: now } }
          ]
        }
      ]
    };

    // Parallel retrieval of curated homepage constituents
    const [
      heroBanners,
      editorialBanners,
      categories,
      collections,
      sections,
      newArrivals,
      bestsellersResult,
      trendingProducts,
      activeOffers,
      showrooms,
      dailyWear,
      diamondProducts,
      goldProducts,
      luxuryHighlights,
      limitedEdition,
      videoProducts
    ] = await Promise.all([
      // 1. Hero Carousel Banners
      Banner.find({
        ...bannerScheduleFilter,
        placement: 'HERO_CAROUSEL'
      })
        .sort({ displayOrder: 1, createdAt: -1 })
        .lean(),

      // 2. Editorial & Heritage Banners
      Banner.find({
        ...bannerScheduleFilter,
        placement: { $in: ['EDITORIAL_SPOTLIGHT', 'HERITAGE_BANNER', 'PROMOTIONAL_STRIP', 'CATEGORY_BILLBOARD'] }
      })
        .sort({ displayOrder: 1, createdAt: -1 })
        .lean(),

      // 3. Category Merchandising (Active, Non-archived)
      Category.find({ isActive: true, isArchived: false })
        .sort({ displayOrder: 1, name: 1 })
        .limit(10)
        .lean(),

      // 4. Curated Collections
      Collection.find({ status: 'ACTIVE', isFeatured: true })
        .sort({ 'merchandisingMetadata.displayOrder': 1, createdAt: -1 })
        .limit(6)
        .lean(),

      // 5. Configurable Merchandising Sections
      HomepageSection.find({ isActive: true })
        .sort({ displayOrder: 1 })
        .populate('targetCategory', 'name slug image')
        .populate('targetCollection', 'name slug bannerImage thumbnailImage')
        .populate({
          path: 'curatedProductIds',
          match: { status: 'PUBLISHED' },
          populate: { path: 'variants', match: { isActive: true } }
        })
        .lean(),

      // 6. New Arrivals
      productService.getNewArrivals({ limit: 8 }),

      // 7. Best Sellers (Strictly confirmed order sales)
      productService.getRealBestsellers({ limit: 8 }),

      // 8. Trending Products (Real engagement metrics: sales, reviews, wishlists, carts, views)
      productService.getRealTrending({ limit: 8 }),

      // 9. Active Offers & Seasonal Campaigns (With populated categories, collections, and products)
      Offer.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
      })
        .sort({ priority: -1, endDate: 1 })
        .populate('applicableCategories', 'name slug')
        .populate('applicableCollections', 'name slug')
        .populate('applicableProducts', 'title slug images pricing')
        .limit(4)
        .lean(),

      // 10. Boutiques & Physical Showrooms
      StoreLocation.find({ isActive: true })
        .select('name slug addressLine city state postalCode phone openingHours vipLoungeAvailable images')
        .limit(4)
        .lean(),

      // 11. Daily-Wear Jewellery Discovery
      Product.find({
        status: 'PUBLISHED',
        $or: [
          { occasion: 'EVERYDAY_LUXURY' },
          { 'materialOverview.primaryMetal': { $in: ['YELLOW_GOLD', 'ROSE_GOLD', 'WHITE_GOLD'] } }
        ]
      })
        .populate('category', 'name slug')
        .populate({ path: 'variants', match: { isActive: true } })
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),

      // 12. Haute Joaillerie Diamond Reserve
      Product.find({
        status: 'PUBLISHED',
        'materialOverview.hasDiamonds': true
      })
        .populate('category', 'name slug')
        .populate({ path: 'variants', match: { isActive: true } })
        .sort({ 'pricing.calculatedPricePaise': -1, 'pricing.baseMetalPricePaise': -1 })
        .limit(2)
        .lean(),

      // 13. Royal 22K Gold Sovereign Products
      Product.find({
        status: 'PUBLISHED',
        'materialOverview.primaryMetal': 'YELLOW_GOLD'
      })
        .populate('category', 'name slug')
        .populate({ path: 'variants', match: { isActive: true } })
        .sort({ createdAt: -1 })
        .limit(2)
        .lean(),

      // 14. High Jewellery Highlights
      Product.find({
        status: 'PUBLISHED',
        isFeatured: true
      })
        .populate('category', 'name slug')
        .populate({ path: 'variants', match: { isActive: true } })
        .sort({ 'pricing.calculatedPricePaise': -1, 'pricing.baseMetalPricePaise': -1 })
        .limit(3)
        .lean(),

      // 15. Ultra-Exclusive Limited-Edition Feature
      Product.findOne({
        status: 'PUBLISHED',
        isLimitedEdition: true
      })
        .populate('category', 'name slug')
        .populate({ path: 'variants', match: { isActive: true } })
        .lean(),

      // 16. Atelier & Model Video Showcase Products
      Product.find({
        status: 'PUBLISHED'
      })
        .populate('category', 'name slug')
        .populate({ path: 'variants', match: { isActive: true } })
        .sort({ averageRating: -1, reviewCount: -1 })
        .limit(2)
        .lean()
    ]);

    return {
      heroBanners,
      editorialBanners,
      categories,
      collections,
      sections,
      newArrivals,
      bestSellers: bestsellersResult.products,
      bestsellersMetadata: bestsellersResult.documentedRule,
      trending: trendingProducts.products,
      trendingMetadata: trendingProducts.documentedRule,
      offers: activeOffers,
      showrooms,
      dailyWear: dailyWear.map((p) => enrichProductWithPricingAndOffers(p, activeOffers)),
      diamondProducts: diamondProducts.map((p) => enrichProductWithPricingAndOffers(p, activeOffers)),
      goldProducts: goldProducts.map((p) => enrichProductWithPricingAndOffers(p, activeOffers)),
      luxuryHighlights: luxuryHighlights.map((p) => enrichProductWithPricingAndOffers(p, activeOffers)),
      limitedEdition: limitedEdition ? enrichProductWithPricingAndOffers(limitedEdition, activeOffers) : null,
      videoProducts: videoProducts.map((p) => enrichProductWithPricingAndOffers(p, activeOffers)),
      appointmentCta: {
        title: 'Experience Haute Joaillerie in Person',
        description: 'Reserve an exclusive one-on-one consultation in our private boutique salon with a certified gemologist.',
        bookingEndpoint: '/api/v1/appointments',
        buttonText: 'Book VIP Consultation'
      }
    };
  },

  /**
   * Trending products rule:
   * Algorithmically computed from verified customer transactions, patron appraisals,
   * wishlist saves, cart reservations, and genuine telemetric views.
   */
  async getTrendingProducts({ limit = 8 } = {}) {
    return productService.getRealTrending({ limit });
  },

  // ==========================================
  // BANNER ADMINISTRATIVE OPERATIONS
  // ==========================================

  async createBanner(data) {
    const key = data.key.toUpperCase();
    const existing = await Banner.findOne({ key });
    if (existing) {
      throw new ConflictError(`Banner with key '${key}' already exists.`);
    }

    const banner = await Banner.create({
      ...data,
      key
    });

    return banner;
  },

  async getBanners({ placement, isActive } = {}) {
    const filter = {};
    if (placement) filter.placement = placement;
    if (typeof isActive === 'boolean') filter.isActive = isActive;

    return Banner.find(filter).sort({ placement: 1, displayOrder: 1, createdAt: -1 });
  },

  async updateBanner(id, updateData) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid banner ID.');
    }

    const banner = await Banner.findById(id);
    if (!banner) {
      throw new NotFoundError('Banner not found.');
    }

    if (updateData.key) {
      const key = updateData.key.toUpperCase();
      const existing = await Banner.findOne({ _id: { $ne: id }, key });
      if (existing) {
        throw new ConflictError(`Banner key '${key}' is already in use.`);
      }
      updateData.key = key;
    }

    Object.assign(banner, updateData);
    await banner.save();

    return banner;
  },

  async deleteBanner(id) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid banner ID.');
    }

    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) {
      throw new NotFoundError('Banner not found.');
    }

    return { deletedId: id, key: banner.key };
  },

  // ==========================================
  // HOMEPAGE SECTION OPERATIONS
  // ==========================================

  async createSection(data) {
    const key = data.key.toUpperCase();
    const existing = await HomepageSection.findOne({ key });
    if (existing) {
      throw new ConflictError(`Homepage section with key '${key}' already exists.`);
    }

    const section = await HomepageSection.create({
      ...data,
      key
    });

    return section;
  },

  async getSections({ isActive } = {}) {
    const filter = {};
    if (typeof isActive === 'boolean') filter.isActive = isActive;

    return HomepageSection.find(filter)
      .sort({ displayOrder: 1 })
      .populate('targetCategory', 'name slug')
      .populate('targetCollection', 'name slug')
      .populate('curatedProductIds', 'title slug pricing images');
  },

  async updateSection(id, updateData) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid section ID.');
    }

    const section = await HomepageSection.findById(id);
    if (!section) {
      throw new NotFoundError('Homepage section not found.');
    }

    if (updateData.key) {
      const key = updateData.key.toUpperCase();
      const existing = await HomepageSection.findOne({ _id: { $ne: id }, key });
      if (existing) {
        throw new ConflictError(`Section key '${key}' is already in use.`);
      }
      updateData.key = key;
    }

    Object.assign(section, updateData);
    await section.save();

    return section;
  },

  async deleteSection(id) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid section ID.');
    }

    const section = await HomepageSection.findByIdAndDelete(id);
    if (!section) {
      throw new NotFoundError('Homepage section not found.');
    }

    return { deletedId: id, key: section.key };
  }
};
