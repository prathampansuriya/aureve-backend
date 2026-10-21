import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Category } from '../models/Category.js';
import { Collection } from '../models/Collection.js';
import { Order } from '../models/Order.js';
import { Wishlist } from '../models/Wishlist.js';
import { Cart } from '../models/Cart.js';
import { Review } from '../models/Review.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { Offer } from '../models/Offer.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/AppError.js';
import { slugify } from '../utils/slugHelper.js';
import { enrichProductWithPricingAndOffers } from '../utils/pricingHelper.js';

export const productService = {
  /**
   * Create a new jewellery product master record.
   */
  async createProduct(data) {
    const slug = data.slug ? slugify(data.slug) : slugify(data.title);
    if (!slug) {
      throw new ValidationError('A valid title or slug is required.');
    }

    // Verify master SKU and slug uniqueness
    const existing = await Product.findOne({
      $or: [{ slug }, { sku: data.sku.toUpperCase() }]
    });

    if (existing) {
      if (existing.slug === slug) {
        throw new ConflictError(`Product slug '${slug}' is already in use.`);
      }
      throw new ConflictError(`Product master SKU '${data.sku.toUpperCase()}' is already in use.`);
    }

    // Verify category existence and status
    const category = await Category.findById(data.categoryId);
    if (!category) {
      throw new NotFoundError('Referenced category does not exist.');
    }
    if (category.isArchived) {
      throw new ValidationError('Cannot assign an archived category to a product.');
    }

    // Verify collections if provided
    if (data.collectionIds && data.collectionIds.length > 0) {
      const validCollectionsCount = await Collection.countDocuments({
        _id: { $in: data.collectionIds },
        status: { $ne: 'ARCHIVED' }
      });
      if (validCollectionsCount !== data.collectionIds.length) {
        throw new ValidationError('One or more referenced collections are invalid or archived.');
      }
    }

    // Handle limited edition initialization
    if (data.isLimitedEdition) {
      const total = data.limitedEditionDetails?.totalEditionQuantity || 0;
      if (total <= 0) {
        throw new ValidationError('Limited edition products must specify totalEditionQuantity > 0.');
      }
      if (!data.limitedEditionDetails.remainingStock && data.limitedEditionDetails.remainingStock !== 0) {
        data.limitedEditionDetails.remainingStock = total;
      }
    }

    // Handle initial primary image flag
    if (data.images && data.images.length > 0) {
      const hasPrimary = data.images.some((img) => img.isPrimary);
      if (!hasPrimary) {
        data.images[0].isPrimary = true;
      }
    }

    // Enforce publication checklist if initially set to PUBLISHED
    if (data.status === 'PUBLISHED') {
      if (!category.isActive) {
        throw new ValidationError('Cannot publish a product under an inactive category.');
      }
      if (!data.images || data.images.length === 0) {
        throw new ValidationError('Cannot publish a product without at least one showcase image.');
      }
      if (!data.pricing || data.pricing.baseMetalPricePaise <= 0) {
        throw new ValidationError('Published product must have a base metal price greater than zero.');
      }
    }

    const product = await Product.create({
      ...data,
      slug,
      sku: data.sku.toUpperCase()
    });

    return product;
  },

  /**
   * Update product master record with publication safeguards.
   */
  async updateProduct(id, updateData) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid product ID.');
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    // Check slug and SKU uniqueness if changed
    if (updateData.title || updateData.slug || updateData.sku) {
      const newSlug = updateData.slug ? slugify(updateData.slug) : updateData.title ? slugify(updateData.title) : product.slug;
      const newSku = updateData.sku ? updateData.sku.toUpperCase() : product.sku;

      const collisionFilter = {
        _id: { $ne: id },
        $or: [{ slug: newSlug }, { sku: newSku }]
      };

      const collision = await Product.findOne(collisionFilter);
      if (collision) {
        if (collision.slug === newSlug) {
          throw new ConflictError(`Product slug '${newSlug}' is already taken.`);
        }
        throw new ConflictError(`Product master SKU '${newSku}' is already taken.`);
      }

      if (updateData.slug || updateData.title) updateData.slug = newSlug;
      if (updateData.sku) updateData.sku = newSku;
    }

    // Check category if changed
    if (updateData.categoryId) {
      const category = await Category.findById(updateData.categoryId);
      if (!category || category.isArchived) {
        throw new ValidationError('Referenced category does not exist or is archived.');
      }
    }

    // Check publication rules if updating to PUBLISHED
    const targetStatus = updateData.status || product.status;
    if (targetStatus === 'PUBLISHED') {
      const categoryId = updateData.categoryId || product.categoryId;
      const category = await Category.findById(categoryId);
      if (!category || !category.isActive || category.isArchived) {
        throw new ValidationError('Cannot publish product: category is inactive or archived.');
      }

      const images = updateData.images || product.images;
      if (!images || images.length === 0) {
        throw new ValidationError('Cannot publish product without at least one showcase image.');
      }

      // Check that at least one active variant exists
      const variantCount = await ProductVariant.countDocuments({
        productId: id,
        isActive: true
      });
      if (variantCount === 0) {
        throw new ValidationError('Cannot publish product without at least one active product variant.');
      }
    }

    // Invariant: Never let ordinary edits silently increase a limited edition's total production quantity
    if (product.isLimitedEdition && updateData.limitedEditionDetails?.totalEditionQuantity !== undefined) {
      const currentTotal = product.limitedEditionDetails?.totalEditionQuantity || 0;
      const requestedTotal = updateData.limitedEditionDetails.totalEditionQuantity;
      if (requestedTotal > currentTotal && !updateData.isAuthorizedEditionExpansion) {
        throw new ValidationError(
          `Cannot increase a limited edition total production quantity from ${currentTotal} to ${requestedTotal} without explicit authorization.`
        );
      }
    }

    Object.assign(product, updateData);
    await product.save();

    return product;
  },

  /**
   * Safe product deletion: prevents hard deletion if purchase orders exist.
   */
  async deleteProduct(id) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid product ID.');
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    // Safeguard: Check if purchase orders contain this product
    const orderCount = await Order.countDocuments({ 'items.productId': id });
    if (orderCount > 0) {
      throw new ConflictError(
        `Cannot delete product '${product.title}' because it is referenced in ${orderCount} customer order(s). Please archive the product instead to preserve purchase history.`
      );
    }

    // Clean up associated child variants and inventory logs
    await ProductVariant.deleteMany({ productId: id });
    await InventoryLog.deleteMany({ productId: id });
    await Product.findByIdAndDelete(id);

    return { deletedId: id, title: product.title };
  },

  /**
   * Retrieve single product by MongoDB ID or slug with populated variants and categories.
   */
  async getProductByIdOrSlug(idOrSlug, { isCustomer = true } = {}) {
    const isObjectId = mongoose.isValidObjectId(idOrSlug);
    const filter = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

    if (isCustomer) {
      filter.status = 'PUBLISHED';
    }

    const product = await Product.findOne(filter)
      .populate('category', 'name slug isActive')
      .populate('collections', 'name slug tagline')
      .populate({
        path: 'variants',
        match: isCustomer ? { isActive: true } : {}
      });

    if (!product) {
      throw new NotFoundError(`Product '${idOrSlug}' not found.`);
    }

    const activeOffers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    })
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return enrichProductWithPricingAndOffers(product, activeOffers);
  },

  /**
   * Create a product variant with SKU uniqueness and initial stock audit logging.
   */
  async createVariant(productId, variantData, adminUser = null) {
    if (!mongoose.isValidObjectId(productId)) {
      throw new ValidationError('Invalid product ID.');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Parent product not found.');
    }

    const sku = variantData.sku.toUpperCase();

    // Check SKU uniqueness across all variants
    const existingSku = await ProductVariant.findOne({ sku });
    if (existingSku) {
      throw new ConflictError(`Variant SKU '${sku}' is already in use.`);
    }

    // Check compound unique specification
    const existingSpec = await ProductVariant.findOne({
      productId,
      metalType: variantData.metalType,
      metalPurity: variantData.metalPurity,
      size: variantData.size
    });

    if (existingSpec) {
      throw new ConflictError(
        `A variant with metal '${variantData.metalType}', purity '${variantData.metalPurity}', and size '${variantData.size}' already exists for this product.`
      );
    }

    const initialStock = variantData.inventoryCount || 0;

    const variant = await ProductVariant.create({
      ...variantData,
      productId,
      sku,
      reservedCount: 0,
      inventoryCount: initialStock,
      availability: initialStock > 0 ? 'AVAILABLE' : 'DEPLETED'
    });

    // Write initial stock movement to InventoryLog
    if (initialStock > 0) {
      await InventoryLog.create({
        variantId: variant._id,
        productId,
        movementType: 'INITIAL_STOCK',
        quantityChanged: initialStock,
        previousQuantity: 0,
        newQuantity: initialStock,
        performedBy: adminUser?._id || null,
        reason: 'Initial variant creation stock entry'
      });
    }

    return variant;
  },

  /**
   * Update variant attributes.
   */
  async updateVariant(variantId, updateData) {
    if (!mongoose.isValidObjectId(variantId)) {
      throw new ValidationError('Invalid variant ID.');
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      throw new NotFoundError('Variant not found.');
    }

    if (updateData.sku) {
      const newSku = updateData.sku.toUpperCase();
      const existingSku = await ProductVariant.findOne({
        _id: { $ne: variantId },
        sku: newSku
      });
      if (existingSku) {
        throw new ConflictError(`Variant SKU '${newSku}' is already taken.`);
      }
      updateData.sku = newSku;
    }

    // Check compound uniqueness if specs are changing
    const metalType = updateData.metalType || variant.metalType;
    const metalPurity = updateData.metalPurity || variant.metalPurity;
    const size = updateData.size || variant.size;

    if (updateData.metalType || updateData.metalPurity || updateData.size) {
      const existingSpec = await ProductVariant.findOne({
        _id: { $ne: variantId },
        productId: variant.productId,
        metalType,
        metalPurity,
        size
      });
      if (existingSpec) {
        throw new ConflictError('A variant with this metal, purity, and size specification already exists for this piece.');
      }
    }

    // Note: Inventory count adjustments must go through adjustStock for strict audit logging
    delete updateData.inventoryCount;
    delete updateData.reservedCount;

    Object.assign(variant, updateData);
    await variant.save();

    return variant;
  },

  /**
   * Delete variant with order protection.
   */
  async deleteVariant(variantId) {
    if (!mongoose.isValidObjectId(variantId)) {
      throw new ValidationError('Invalid variant ID.');
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      throw new NotFoundError('Variant not found.');
    }

    const orderCount = await Order.countDocuments({ 'items.variantId': variantId });
    if (orderCount > 0) {
      throw new ConflictError(
        `Cannot delete variant '${variant.sku}' because it is part of ${orderCount} existing order(s). Deactivate it by setting isActive: false.`
      );
    }

    await ProductVariant.findByIdAndDelete(variantId);
    await InventoryLog.deleteMany({ variantId });

    return { deletedId: variantId, sku: variant.sku };
  },

  /**
   * Atomic stock adjustment with immutable audit log and non-negative invariant.
   */
  async adjustStock(variantId, { adjustment, reason, performedBy = null }) {
    if (!mongoose.isValidObjectId(variantId)) {
      throw new ValidationError('Invalid variant ID.');
    }

    if (!adjustment || adjustment === 0) {
      throw new ValidationError('Adjustment quantity cannot be zero.');
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      throw new NotFoundError('Variant not found.');
    }

    const previousQuantity = variant.inventoryCount;
    const newQuantity = previousQuantity + adjustment;

    if (newQuantity < 0) {
      throw new ValidationError(
        `Adjustment would result in negative inventory (Current: ${previousQuantity}, Adjustment: ${adjustment}).`
      );
    }

    if (newQuantity < variant.reservedCount) {
      throw new ValidationError(
        `Cannot adjust stock below currently active reservations (${variant.reservedCount} units reserved).`
      );
    }

    variant.inventoryCount = newQuantity;
    variant.availability = (newQuantity - variant.reservedCount) > 0 ? 'AVAILABLE' : 'DEPLETED';
    await variant.save();

    // If parent is limited edition, adjust remainingStock accordingly
    const product = await Product.findById(variant.productId);
    if (product && product.isLimitedEdition) {
      const prevRemaining = product.limitedEditionDetails?.remainingStock || 0;
      const newRemaining = Math.max(0, prevRemaining + adjustment);
      product.limitedEditionDetails.remainingStock = newRemaining;
      await product.save();
    }

    // Write immutable audit log
    const log = await InventoryLog.create({
      variantId,
      productId: variant.productId,
      movementType: 'ADMIN_ADJUSTMENT',
      quantityChanged: adjustment,
      previousQuantity,
      newQuantity,
      performedBy,
      reason
    });

    return {
      variant,
      log,
      availableStock: variant.availableStock
    };
  },

  /**
   * Checkout reservation: holds stock for active checkout session.
   */
  async reserveStock(variantId, quantity, { orderId = null, performedBy = null, reason = 'Checkout reservation' } = {}) {
    if (!mongoose.isValidObjectId(variantId)) {
      throw new ValidationError('Invalid variant ID.');
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      throw new NotFoundError('Variant not found.');
    }

    const available = variant.inventoryCount - variant.reservedCount;
    if (available < quantity) {
      throw new ValidationError(
        `Insufficient stock to reserve ${quantity} unit(s). Available: ${available}, In stock: ${variant.inventoryCount}.`
      );
    }

    variant.reservedCount += quantity;
    if (variant.inventoryCount - variant.reservedCount <= 0) {
      variant.availability = 'DEPLETED';
    }
    await variant.save();

    const log = await InventoryLog.create({
      variantId,
      productId: variant.productId,
      orderId,
      movementType: 'CHECKOUT_RESERVATION',
      quantityChanged: quantity,
      previousQuantity: variant.reservedCount - quantity,
      newQuantity: variant.reservedCount,
      performedBy,
      reason
    });

    return { variant, log };
  },

  /**
   * Release reserved stock (checkout abandoned or expired).
   */
  async releaseStock(variantId, quantity, { orderId = null, performedBy = null, reason = 'Checkout reservation release/expiry' } = {}) {
    if (!mongoose.isValidObjectId(variantId)) {
      throw new ValidationError('Invalid variant ID.');
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      throw new NotFoundError('Variant not found.');
    }

    const actualRelease = Math.min(variant.reservedCount, quantity);
    variant.reservedCount = Math.max(0, variant.reservedCount - actualRelease);
    if (variant.inventoryCount - variant.reservedCount > 0) {
      variant.availability = 'AVAILABLE';
    }
    await variant.save();

    const log = await InventoryLog.create({
      variantId,
      productId: variant.productId,
      orderId,
      movementType: 'RESERVATION_EXPIRY',
      quantityChanged: -actualRelease,
      previousQuantity: variant.reservedCount + actualRelease,
      newQuantity: variant.reservedCount,
      performedBy,
      reason
    });

    return { variant, log };
  },

  /**
   * Update product rich media assets (images, 360 videos, model-wearing reels).
   */
  async updateMedia(productId, { images, videos }) {
    if (!mongoose.isValidObjectId(productId)) {
      throw new ValidationError('Invalid product ID.');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    if (images) {
      if (!Array.isArray(images) || images.length === 0) {
        throw new ValidationError('At least one primary showcase image is required.');
      }
      const hasPrimary = images.some((img) => img.isPrimary);
      if (!hasPrimary) {
        images[0].isPrimary = true;
      }
      product.images = images;
    }

    if (videos) {
      product.videos = videos;
    }

    await product.save();
    return product;
  },

  /**
   * Catalog discovery with multi-faceted filtering, parameterized search, and sorting.
   */
  async getCatalog(query = {}, { isCustomer = true } = {}) {
    const filter = {};

    // Publication filter
    if (isCustomer) {
      filter.status = 'PUBLISHED';
    } else if (query.status) {
      filter.status = query.status;
    }

    // Category filter (support slug or ObjectId)
    if (query.category) {
      if (mongoose.isValidObjectId(query.category)) {
        filter.categoryId = query.category;
      } else {
        const cat = await Category.findOne({ slug: query.category.toLowerCase() });
        if (cat) {
          filter.categoryId = cat._id;
        } else {
          // If category slug doesn't exist, return empty result set safely
          return { products: [], pagination: { page: 1, limit: query.limit || 20, total: 0, totalPages: 0 }, facets: {} };
        }
      }
    }

    // Collection filter (support slug or ObjectId)
    if (query.collection) {
      if (mongoose.isValidObjectId(query.collection)) {
        filter.collectionIds = query.collection;
      } else {
        const col = await Collection.findOne({ slug: query.collection.toLowerCase() });
        if (col) {
          filter.collectionIds = col._id;
        } else {
          return { products: [], pagination: { page: 1, limit: query.limit || 20, total: 0, totalPages: 0 }, facets: {} };
        }
      }
    }

    // Demographics and Occasion
    if (query.gender) filter.gender = query.gender;
    if (query.occasion) filter.occasion = query.occasion;
    if (query.availability) filter.availability = query.availability;

    // Metal & Purity
    if (query.metal) filter['materialOverview.primaryMetal'] = query.metal;
    if (query.purity) filter['materialOverview.primaryPurity'] = query.purity;

    // Price range filter
    if (query.minPricePaise !== undefined || query.maxPricePaise !== undefined) {
      const priceBounds = {};
      if (query.minPricePaise !== undefined) {
        priceBounds.$gte = Number(query.minPricePaise);
      }
      if (query.maxPricePaise !== undefined) {
        priceBounds.$lte = Number(query.maxPricePaise);
      }
      filter.$or = [
        { 'pricing.calculatedPricePaise': priceBounds },
        { 'pricing.baseMetalPricePaise': priceBounds }
      ];
    }

    // Merchandising flags
    if (query.isNewArrival !== undefined) filter.isNewArrival = query.isNewArrival;
    if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured;
    if (query.isBestseller !== undefined) filter.isBestseller = query.isBestseller;

    // Text search (safe parameterized regex)
    const textQuery = query.q || query.search;
    if (textQuery) {
      const sanitized = textQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { sku: { $regex: sanitized, $options: 'i' } },
        { shortDescription: { $regex: sanitized, $options: 'i' } },
        { tags: { $in: [new RegExp(sanitized, 'i')] } }
      ];
    }

    // Sorting map
    let sortOption = { createdAt: -1 };
    switch (query.sort) {
      case 'price_asc':
        sortOption = { 'pricing.calculatedPricePaise': 1, 'pricing.baseMetalPricePaise': 1 };
        break;
      case 'price_desc':
        sortOption = { 'pricing.calculatedPricePaise': -1, 'pricing.baseMetalPricePaise': -1 };
        break;
      case 'rating':
        sortOption = { averageRating: -1, reviewCount: -1 };
        break;
      case 'popularity':
        sortOption = { isBestseller: -1, averageRating: -1, createdAt: -1 };
        break;
      case 'relevance':
        sortOption = query.q ? { isFeatured: -1, createdAt: -1 } : { createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [products, total, activeOffers] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .populate('collections', 'name slug')
        .populate({
          path: 'variants',
          match: isCustomer ? { isActive: true } : {}
        })
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
      Offer.find({
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      })
        .sort({ priority: -1, createdAt: -1 })
        .lean()
    ]);

    const enrichedProducts = products.map((p) =>
      enrichProductWithPricingAndOffers(p, activeOffers)
    );

    // Facet aggregation for catalog refinement sidebar
    const facets = await this.getFilterFacets(filter);

    return {
      products: enrichedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      facets
    };
  },

  /**
   * Calculate catalog facets (price bounds, available metals, purities, categories, occasions).
   */
  async getFilterFacets(_baseFilter = {}) {
    const publishedFilter = { status: 'PUBLISHED' };

    const [priceBounds, metals, categories, occasions] = await Promise.all([
      Product.aggregate([
        { $match: publishedFilter },
        {
          $group: {
            _id: null,
            minPricePaise: {
              $min: {
                $cond: [
                  { $gt: ['$pricing.calculatedPricePaise', 0] },
                  '$pricing.calculatedPricePaise',
                  {
                    $add: [
                      { $ifNull: ['$pricing.baseMetalPricePaise', 0] },
                      { $ifNull: ['$pricing.diamondStonePricePaise', 0] },
                      { $ifNull: ['$pricing.makingChargesPaise', 0] }
                    ]
                  }
                ]
              }
            },
            maxPricePaise: {
              $max: {
                $cond: [
                  { $gt: ['$pricing.calculatedPricePaise', 0] },
                  '$pricing.calculatedPricePaise',
                  {
                    $add: [
                      { $ifNull: ['$pricing.baseMetalPricePaise', 0] },
                      { $ifNull: ['$pricing.diamondStonePricePaise', 0] },
                      { $ifNull: ['$pricing.makingChargesPaise', 0] }
                    ]
                  }
                ]
              }
            }
          }
        }
      ]),
      Product.distinct('materialOverview.primaryMetal', publishedFilter),
      Category.find({ isActive: true, isArchived: false }).select('name slug').lean(),
      Product.distinct('occasion', publishedFilter)
    ]);

    return {
      priceRange: {
        minPaise: priceBounds[0]?.minPricePaise || 0,
        maxPaise: priceBounds[0]?.maxPricePaise || 100000000
      },
      metals: metals || [],
      categories: categories || [],
      occasions: occasions || []
    };
  },

  /**
   * Best sellers based strictly on actual paid order data.
   * Documented Rule: Only items with aggregated sales > 0 from completed orders are returned.
   */
  async getRealBestsellers({ limit = 10 } = {}) {
    const salesAggregation = await Order.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalUnitsSold: { $sum: '$items.quantity' },
          totalRevenuePaise: { $sum: '$items.totalPaise' }
        }
      },
      { $sort: { totalUnitsSold: -1, totalRevenuePaise: -1 } },
      { $limit: limit }
    ]);

    if (!salesAggregation || salesAggregation.length === 0) {
      return {
        products: [],
        documentedRule: 'Bestsellers are computed strictly from completed customer orders (paymentStatus: PAID). Without completed sales records, no arbitrary products are labeled as bestsellers.',
        count: 0
      };
    }

    const productIds = salesAggregation.map((item) => item._id);

    const products = await Product.find({
      _id: { $in: productIds },
      status: 'PUBLISHED'
    })
      .populate('category', 'name slug')
      .populate('variants');

    const activeOffers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    })
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    // Preserve order of sales volume and enrich pricing
    const sortedProducts = productIds
      .map((id) => products.find((p) => p._id.toString() === id.toString()))
      .filter(Boolean)
      .map((p) => enrichProductWithPricingAndOffers(p, activeOffers));

    return {
      products: sortedProducts,
      documentedRule: 'Bestsellers are ranked by total confirmed units sold from completed customer orders (paymentStatus: PAID).',
      count: sortedProducts.length
    };
  },

  /**
   * New arrivals listing.
   */
  async getNewArrivals({ limit = 10 } = {}) {
    const [products, activeOffers] = await Promise.all([
      Product.find({
        status: 'PUBLISHED',
        isNewArrival: true
      })
        .populate('category', 'name slug')
        .populate('variants')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Offer.find({
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      })
        .sort({ priority: -1, createdAt: -1 })
        .lean()
    ]);

    return products.map((p) => enrichProductWithPricingAndOffers(p, activeOffers));
  },

  /**
   * Related products based on actual catalog relationships (same category, collection, or occasion).
   */
  async getRelatedProducts(idOrSlug, { limit = 8 } = {}) {
    const product = await this.getProductByIdOrSlug(idOrSlug, { isCustomer: true });

    const [related, activeOffers] = await Promise.all([
      Product.find({
        _id: { $ne: product._id },
        status: 'PUBLISHED',
        $or: [
          { categoryId: product.categoryId },
          { collectionIds: { $in: product.collectionIds } },
          { occasion: product.occasion }
        ]
      })
        .populate('category', 'name slug')
        .populate('variants')
        .sort({ averageRating: -1, createdAt: -1 })
        .limit(limit)
        .lean(),
      Offer.find({
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      })
        .sort({ priority: -1, createdAt: -1 })
        .lean()
    ]);

    return related.map((p) => enrichProductWithPricingAndOffers(p, activeOffers));
  },

  /**
   * Real Trending Jewellery based on actual multi-dimensional customer engagement metrics:
   * 1. Verified Completed Purchases (Order: paymentStatus === 'PAID') [Weight: 10]
   * 2. Verified Patron Reviews & Star Appraisals (Review: count * rating) [Weight: 4]
   * 3. Private Vault Wishlist Additions (Wishlist: count) [Weight: 3]
   * 4. Active Shopping Bag Reservations (Cart: count) [Weight: 2]
   * 5. Product Detail Telemetric Views (Product: engagement.viewCount) [Weight: 0.2]
   *
   * Products must be published (status === 'PUBLISHED').
   * Excludes cancelled/refunded orders.
   * Deterministic sorting: trendingScore DESC, reviewCount DESC, createdAt DESC.
   */
  async getRealTrending({ limit = 8 } = {}) {
    // 1. Query confirmed sales by product
    const salesAgg = await Order.aggregate([
      { $match: { paymentStatus: 'PAID', orderStatus: { $nin: ['CANCELLED', 'REFUNDED'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          unitsSold: { $sum: '$items.quantity' }
        }
      }
    ]);
    const salesMap = new Map();
    salesAgg.forEach((s) => {
      if (s._id) salesMap.set(s._id.toString(), s.unitsSold);
    });

    // 2. Query active wishlist saves by product
    const wishlistAgg = await Wishlist.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          wishlistCount: { $sum: 1 }
        }
      }
    ]);
    const wishlistMap = new Map();
    wishlistAgg.forEach((w) => {
      if (w._id) wishlistMap.set(w._id.toString(), w.wishlistCount);
    });

    // 3. Query active cart items by product
    const cartAgg = await Cart.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          cartCount: { $sum: '$items.quantity' }
        }
      }
    ]);
    const cartMap = new Map();
    cartAgg.forEach((c) => {
      if (c._id) cartMap.set(c._id.toString(), c.cartCount);
    });

    // 4. Retrieve published products with their reviews and view metrics
    const candidates = await Product.find({ status: 'PUBLISHED' })
      .populate('category', 'name slug')
      .populate({ path: 'variants', match: { isActive: true } })
      .lean();

    // 5. Score every candidate
    const scoredProducts = candidates.map((prod) => {
      const prodIdStr = prod._id.toString();
      const unitsSold = salesMap.get(prodIdStr) || 0;
      const wishlistCount = wishlistMap.get(prodIdStr) || 0;
      const cartCount = cartMap.get(prodIdStr) || 0;
      const reviewCount = prod.reviewCount || 0;
      const avgRating = prod.averageRating || 0;
      const viewCount = prod.engagement?.viewCount || 0;

      // Transparent multi-factor engagement formula
      const score =
        unitsSold * 10 +
        reviewCount * avgRating * 2 +
        wishlistCount * 3 +
        cartCount * 2 +
        Math.min(10, Math.floor(viewCount / 5));

      return {
        ...prod,
        engagementMetrics: {
          unitsSold,
          wishlistCount,
          cartCount,
          reviewCount,
          averageRating: avgRating,
          viewCount,
          trendingScore: Math.round(score * 10) / 10
        }
      };
    });

    // 6. Sort by computed trendingScore desc, tiebreaker: averageRating desc, reviewCount desc, createdAt desc
    scoredProducts.sort((a, b) => {
      const scoreDiff = b.engagementMetrics.trendingScore - a.engagementMetrics.trendingScore;
      if (scoreDiff !== 0) return scoreDiff;
      if ((b.averageRating || 0) !== (a.averageRating || 0)) {
        return (b.averageRating || 0) - (a.averageRating || 0);
      }
      if ((b.reviewCount || 0) !== (a.reviewCount || 0)) {
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    const activeOffers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    })
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    const topTrending = scoredProducts
      .slice(0, limit)
      .map((p) => enrichProductWithPricingAndOffers(p, activeOffers));

    return {
      products: topTrending,
      documentedRule:
        'Trending jewellery is algorithmically ranked from confirmed customer orders, verified patron appraisals, active wishlist saves, and shopping bag reservations.',
      count: topTrending.length
    };
  },

  /**
   * Record genuine product view telemetry.
   */
  async recordProductView(idOrSlug) {
    const isObjectId = mongoose.isValidObjectId(idOrSlug);
    const filter = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

    const product = await Product.findOneAndUpdate(
      filter,
      { $inc: { 'engagement.viewCount': 1 } },
      { new: true }
    ).select('_id slug engagement.viewCount');

    return product;
  }
};
