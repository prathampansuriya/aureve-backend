/**
 * AUREVÉ Authoritative Pricing & Monetary Conversion Utilities.
 * Enforces integer minor units (paise) for storage, exact calculations,
 * and deterministic conversion to display rupees.
 */

/**
 * Converts integer paise to Indian Rupees (floating point representation for display).
 * @param {number} paise - Amount in integer minor units
 * @returns {number} Amount in rupees
 */
export const paiseToRupees = (paise) => {
  if (typeof paise !== 'number' || isNaN(paise)) return 0;
  return Math.round(paise) / 100;
};

/**
 * Converts Indian Rupees to exact integer minor units (paise).
 * @param {number|string} rupees - Amount in rupees
 * @returns {number} Exact integer paise
 */
export const rupeesToPaise = (rupees) => {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (typeof num !== 'number' || isNaN(num)) return 0;
  return Math.round(num * 100);
};

/**
 * Calculates authoritative pricing metadata for a product and its variants.
 * Handles both Mongoose documents and plain objects.
 *
 * @param {Object} product - Product master record
 * @returns {Object} Deterministic pricing summary: { pricePaise, originalPricePaise, minPricePaise, maxPricePaise, hasPriceRange, hasDiscount, discountPercentage }
 */
export const calculateProductPricing = (product) => {
  if (!product) {
    return {
      pricePaise: 0,
      originalPricePaise: 0,
      minPricePaise: 0,
      maxPricePaise: 0,
      hasPriceRange: false,
      hasDiscount: false,
      discountPercentage: 0
    };
  }

  const rawVariants = Array.isArray(product.variants) ? product.variants : [];
  const activeVariants = rawVariants.filter((v) => v && v.isActive !== false);

  if (activeVariants.length > 0) {
    const effectivePrices = activeVariants
      .map((v) =>
        v.discountPriceInPaise && v.discountPriceInPaise < v.priceInPaise
          ? v.discountPriceInPaise
          : v.priceInPaise
      )
      .filter((p) => typeof p === 'number' && p > 0);

    const regularPrices = activeVariants
      .map((v) => v.priceInPaise)
      .filter((p) => typeof p === 'number' && p > 0);

    if (effectivePrices.length > 0) {
      const minPricePaise = Math.min(...effectivePrices);
      const maxPricePaise = Math.max(...effectivePrices);
      const minRegularPaise = Math.min(...regularPrices);
      const hasPriceRange = minPricePaise !== maxPricePaise;
      const hasDiscount = activeVariants.some(
        (v) => v.discountPriceInPaise && v.discountPriceInPaise < v.priceInPaise
      );
      const discountPercentage =
        hasDiscount && minRegularPaise > minPricePaise
          ? Math.round(((minRegularPaise - minPricePaise) / minRegularPaise) * 100)
          : 0;

      return {
        pricePaise: minPricePaise,
        priceRupees: paiseToRupees(minPricePaise),
        originalPricePaise: minRegularPaise,
        originalPriceRupees: paiseToRupees(minRegularPaise),
        minPricePaise,
        minPriceRupees: paiseToRupees(minPricePaise),
        maxPricePaise,
        maxPriceRupees: paiseToRupees(maxPricePaise),
        hasPriceRange,
        hasDiscount,
        discountPercentage
      };
    }
  }

  // Fallback to piece valuation component sum: base metal + diamond/gemstones + making charges
  const componentTotal =
    (product.pricing?.baseMetalPricePaise || 0) +
    (product.pricing?.diamondStonePricePaise || 0) +
    (product.pricing?.makingChargesPaise || 0);

  const regularBase =
    componentTotal > 0
      ? componentTotal
      : (product.pricing?.baseMetalPricePaise || product.pricePaise || 0);

  const discountPrice = product.pricing?.discountPricePaise || null;
  const hasDiscount = Boolean(discountPrice && discountPrice < regularBase);
  const finalPrice = hasDiscount ? discountPrice : regularBase;
  const discountPercentage =
    hasDiscount && regularBase > 0
      ? Math.round(((regularBase - discountPrice) / regularBase) * 100)
      : 0;

  return {
    pricePaise: finalPrice,
    priceRupees: paiseToRupees(finalPrice),
    originalPricePaise: regularBase,
    originalPriceRupees: paiseToRupees(regularBase),
    minPricePaise: finalPrice,
    minPriceRupees: paiseToRupees(finalPrice),
    maxPricePaise: finalPrice,
    maxPriceRupees: paiseToRupees(finalPrice),
    hasPriceRange: false,
    hasDiscount,
    discountPercentage
  };
};

/**
 * Checks whether an active promotional offer genuinely applies to a given product.
 * @param {Object} offer - Active offer record
 * @param {Object} product - Product record
 * @param {Date} [now] - Current date/time for validity window evaluation
 * @returns {boolean}
 */
export const isOfferApplicableToProduct = (offer, product, now = new Date()) => {
  if (!offer || !product) return false;
  if (!offer.isActive) return false;
  if (offer.startDate && new Date(offer.startDate) > now) return false;
  if (offer.endDate && new Date(offer.endDate) < now) return false;

  if (offer.offerType === 'STOREWIDE') {
    return true;
  }

  const prodIdStr = product._id ? product._id.toString() : '';
  const catIdStr = product.categoryId
    ? (product.categoryId._id ? product.categoryId._id.toString() : product.categoryId.toString())
    : (product.category ? (product.category._id ? product.category._id.toString() : product.category.toString()) : '');
  const colIdStrs = (product.collectionIds || product.collections || []).map(
    (c) => (c._id ? c._id.toString() : c.toString())
  );

  if (prodIdStr && offer.applicableProducts?.some((p) => (p._id ? p._id.toString() : p.toString()) === prodIdStr)) {
    return true;
  }
  if (catIdStr && offer.applicableCategories?.some((c) => (c._id ? c._id.toString() : c.toString()) === catIdStr)) {
    return true;
  }
  if (colIdStrs.length > 0 && offer.applicableCollections?.some((col) => colIdStrs.includes(col._id ? col._id.toString() : col.toString()))) {
    return true;
  }

  return false;
};

/**
 * Resolves the best applicable active offer for a product.
 * @param {Object} product - Product record
 * @param {Array<Object>} activeOffers - Pre-fetched active offers
 * @returns {Object|null}
 */
export const getBestOfferForProduct = (product, activeOffers = []) => {
  if (!product || !activeOffers || activeOffers.length === 0) return null;

  const now = new Date();
  const matchingOffers = activeOffers.filter((o) => isOfferApplicableToProduct(o, product, now));
  if (matchingOffers.length === 0) return null;

  // Sort by priority descending, then discount value descending
  matchingOffers.sort((a, b) => {
    if ((b.priority || 0) !== (a.priority || 0)) {
      return (b.priority || 0) - (a.priority || 0);
    }
    return (b.discountValue || 0) - (a.discountValue || 0);
  });

  const best = matchingOffers[0];
  const badgeText =
    best.discountType === 'PERCENTAGE'
      ? `${best.discountValue}% OFF`
      : `SAVE ₹${(best.discountValue / 100).toLocaleString('en-IN')}`;

  return {
    id: best._id,
    title: best.title,
    slug: best.slug,
    description: best.description || '',
    discountType: best.discountType,
    discountValue: best.discountValue,
    offerType: best.offerType,
    badgeText,
    minOrderValuePaise: best.minOrderValuePaise || 0,
    maxDiscountPaise: best.maxDiscountPaise || null,
    allowStackingWithCoupons: Boolean(best.allowStackingWithCoupons),
    bannerUrl: best.bannerUrl || ''
  };
};

/**
 * Enriches a product document or plain object with calculated pricing details and applicable offer.
 * @param {Object} product
 * @param {Array<Object>} [activeOffers]
 * @returns {Object}
 */
export const enrichProductWithPricingAndOffers = (product, activeOffers = []) => {
  if (!product) return product;

  const doc = typeof product.toObject === 'function' ? product.toObject({ virtuals: true }) : { ...product };
  const pricingDetails = calculateProductPricing(doc);
  const applicableOffer = getBestOfferForProduct(doc, activeOffers);

  return {
    ...doc,
    ...pricingDetails,
    pricePaise: pricingDetails.pricePaise,
    originalPricePaise: pricingDetails.originalPricePaise,
    applicableOffer
  };
};
