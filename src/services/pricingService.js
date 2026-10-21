import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Category } from '../models/Category.js';
import { Collection } from '../models/Collection.js';
import { Coupon } from '../models/Coupon.js';
import { Offer } from '../models/Offer.js';
import { ValidationError } from '../utils/AppError.js';

export const pricingService = {
  /**
   * Authoritative price calculation engine for Cart, Checkout, Order, and Payments.
   * Never trusts client-provided amounts. Enforces exact integer minor unit (paise) arithmetic.
   *
   * @param {Array<Object>} items - Array of { productId, variantId, quantity }
   * @param {Object} options - { couponCode, userId, customShippingFeePaise }
   * @returns {Object} Deterministic pricing summary and item snapshots
   */
  async calculateCartPrice(items = [], { couponCode = null, userId = null, customShippingFeePaise = null } = {}) {
    if (!items || items.length === 0) {
      return {
        items: [],
        pricing: {
          subtotalPaise: 0,
          makingChargesPaise: 0,
          offerDiscountPaise: 0,
          couponDiscountPaise: 0,
          totalDiscountPaise: 0,
          discountPaise: 0,
          taxableAmountPaise: 0,
          gstRate: 3,
          gstPaise: 0,
          shippingFeePaise: 0,
          grandTotalPaise: 0
        },
        appliedOffer: null,
        appliedCoupon: null,
        warnings: []
      };
    }

    const now = new Date();
    const warnings = [];

    // 1. Fetch live products and variants from MongoDB
    const variantIds = items.map((i) => i.variantId).filter(Boolean);
    const variants = await ProductVariant.find({ _id: { $in: variantIds } }).lean();
    const variantMap = new Map(variants.map((v) => [v._id.toString(), v]));

    const productIds = [
      ...new Set([...items.map((i) => i.productId), ...variants.map((v) => v.productId.toString())])
    ].filter(Boolean);

    const products = await Product.find({ _id: { $in: productIds } })
      .populate('category', 'name slug')
      .lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    // 2. Validate and price each line item
    const lineItems = [];
    let subtotalPaise = 0;
    let makingChargesPaise = 0;

    for (const item of items) {
      const variant = variantMap.get(item.variantId?.toString());
      const product = variant ? productMap.get(variant.productId.toString()) : null;

      if (!variant || !product) {
        lineItems.push({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          isAvailable: false,
          unavailabilityReason: 'Product or variant no longer exists in catalog.'
        });
        warnings.push(`One of the items in your cart is no longer available.`);
        continue;
      }

      const isPublished = product.status === 'PUBLISHED';
      const isVariantActive = variant.isActive !== false;
      const availableStock = Math.max(0, variant.inventoryCount - variant.reservedCount);
      const isStockSufficient = availableStock >= item.quantity;
      const isAvailable = isPublished && isVariantActive && availableStock > 0;

      if (!isPublished || !isVariantActive) {
        warnings.push(`Item '${product.title}' is currently unavailable for purchase.`);
      } else if (!isStockSufficient) {
        warnings.push(`Only ${availableStock} unit(s) of '${product.title} (${variant.variantName})' remain available.`);
      }

      // Check if price changed from snapshot
      const liveUnitPricePaise =
        variant.discountPriceInPaise && variant.discountPriceInPaise < variant.priceInPaise
          ? variant.discountPriceInPaise
          : variant.priceInPaise;

      if (item.priceInPaise && item.priceInPaise !== liveUnitPricePaise) {
        warnings.push(
          `Price for '${product.title}' has updated from ₹${(item.priceInPaise / 100).toLocaleString('en-IN')} to ₹${(liveUnitPricePaise / 100).toLocaleString('en-IN')}.`
        );
      }

      const itemQty = Math.max(1, Math.min(item.quantity, 5));
      const lineTotalPaise = liveUnitPricePaise * itemQty;
      const itemMakingChargesPaise = (product.pricing?.makingChargesPaise || 0) * itemQty;

      if (isAvailable && isStockSufficient) {
        subtotalPaise += lineTotalPaise;
        makingChargesPaise += itemMakingChargesPaise;
      }

      lineItems.push({
        productId: product._id,
        variantId: variant._id,
        title: product.title,
        slug: product.slug,
        variantName: variant.variantName,
        sku: variant.sku,
        image: variant.variantSpecificMedia?.[0]?.url || product.images?.[0]?.url || '',
        metalType: variant.metalType,
        metalPurity: variant.metalPurity,
        size: variant.size,
        quantity: itemQty,
        unitPricePaise: liveUnitPricePaise,
        originalPricePaise: variant.priceInPaise,
        lineTotalPaise,
        isAvailable: isAvailable && isStockSufficient,
        availableStock,
        unavailabilityReason: !isAvailable
          ? 'Item is inactive or unpublished'
          : !isStockSufficient
            ? `Requested ${item.quantity} exceeds available stock of ${availableStock}`
            : null,
        productRef: product // Used for offer/coupon matching
      });
    }

    // 3. Evaluate Active Promotional Offers
    let appliedOffer = null;
    let offerDiscountPaise = 0;

    const availableLineItems = lineItems.filter((i) => i.isAvailable);

    if (availableLineItems.length > 0 && subtotalPaise > 0) {
      const activeOffers = await Offer.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
      })
        .sort({ priority: -1, createdAt: -1 })
        .lean();

      for (const offer of activeOffers) {
        if (offer.minOrderValuePaise && subtotalPaise < offer.minOrderValuePaise) {
          continue;
        }

        // Calculate eligible items for this offer
        const eligibleItems = availableLineItems.filter((item) => {
          if (offer.offerType === 'STOREWIDE') return true;

          const prod = item.productRef;
          if (!prod) return false;

          const prodIdStr = prod._id.toString();
          const catIdStr = prod.categoryId?.toString();
          const colIdStrs = (prod.collectionIds || []).map((c) => c.toString());

          if (offer.applicableProducts?.some((p) => p.toString() === prodIdStr)) return true;
          if (offer.applicableCategories?.some((c) => c.toString() === catIdStr)) return true;
          if (offer.applicableCollections?.some((col) => colIdStrs.includes(col.toString()))) return true;

          return false;
        });

        if (eligibleItems.length === 0 && offer.offerType !== 'STOREWIDE') {
          continue;
        }

        const eligibleSubtotal =
          offer.offerType === 'STOREWIDE'
            ? subtotalPaise
            : eligibleItems.reduce((acc, i) => acc + i.lineTotalPaise, 0);

        let potentialDiscount = 0;
        if (offer.discountType === 'PERCENTAGE') {
          potentialDiscount = Math.round((eligibleSubtotal * offer.discountValue) / 100);
          if (offer.maxDiscountPaise && potentialDiscount > offer.maxDiscountPaise) {
            potentialDiscount = offer.maxDiscountPaise;
          }
        } else if (offer.discountType === 'FLAT_PAISE') {
          potentialDiscount = Math.min(offer.discountValue, eligibleSubtotal);
        }

        if (potentialDiscount > offerDiscountPaise) {
          offerDiscountPaise = potentialDiscount;
          appliedOffer = {
            id: offer._id,
            title: offer.title,
            slug: offer.slug,
            discountType: offer.discountType,
            discountValue: offer.discountValue,
            discountPaise: potentialDiscount,
            allowStackingWithCoupons: offer.allowStackingWithCoupons
          };
        }
      }
    }

    // 4. Evaluate Coupon Application & Stacking
    let appliedCoupon = null;
    let couponDiscountPaise = 0;

    if (couponCode && availableLineItems.length > 0 && subtotalPaise > 0) {
      const codeUpper = couponCode.trim().toUpperCase();
      const coupon = await Coupon.findOne({ code: codeUpper });

      if (!coupon) {
        throw new ValidationError(`Coupon code '${codeUpper}' is invalid.`);
      }

      if (!coupon.isActive) {
        throw new ValidationError(`Coupon code '${codeUpper}' is currently deactivated.`);
      }

      if (now < coupon.validFrom) {
        throw new ValidationError(`Coupon code '${codeUpper}' is not yet active.`);
      }

      if (now > coupon.validUntil) {
        throw new ValidationError(`Coupon code '${codeUpper}' has expired.`);
      }

      if (coupon.usageLimitTotal !== null && coupon.usageCount >= coupon.usageLimitTotal) {
        throw new ValidationError(`Coupon code '${codeUpper}' has reached its total usage limit.`);
      }

      if (userId && coupon.usageLimitPerUser) {
        const userRedemptionCount = (coupon.redemptions || []).filter(
          (r) => r.userId?.toString() === userId.toString()
        ).length;

        if (userRedemptionCount >= coupon.usageLimitPerUser) {
          throw new ValidationError(
            `You have already redeemed coupon '${codeUpper}' the maximum permitted number of times (${coupon.usageLimitPerUser}).`
          );
        }
      }

      if (coupon.minOrderValuePaise && subtotalPaise < coupon.minOrderValuePaise) {
        throw new ValidationError(
          `Minimum order value of ₹${(coupon.minOrderValuePaise / 100).toLocaleString('en-IN')} required to apply coupon '${codeUpper}'. (Current subtotal: ₹${(subtotalPaise / 100).toLocaleString('en-IN')})`
        );
      }

      // Stacking check: verify if active offer disallows coupon stacking
      if (appliedOffer && !appliedOffer.allowStackingWithCoupons) {
        throw new ValidationError(
          `Coupon '${codeUpper}' cannot be combined with the currently active promotional offer '${appliedOffer.title}'.`
        );
      }

      // Check applicable product/category/collection scopes
      const hasSpecificScopes =
        (coupon.applicableProducts && coupon.applicableProducts.length > 0) ||
        (coupon.applicableCategories && coupon.applicableCategories.length > 0) ||
        (coupon.applicableCollections && coupon.applicableCollections.length > 0);

      let eligibleSubtotal = subtotalPaise;

      if (hasSpecificScopes) {
        const toIdString = (val) => (val?._id ? val._id.toString() : val ? val.toString() : '');

        const matchingItems = availableLineItems.filter((item) => {
          const prod = item.productRef;
          if (!prod) return false;

          const prodIdStr = toIdString(prod._id);
          const catIdStr = toIdString(prod.categoryId || prod.category);
          const colIdStrs = (prod.collectionIds || []).map(toIdString).filter(Boolean);

          const isProdMatch = coupon.applicableProducts?.some((p) => toIdString(p) === prodIdStr);
          const isCatMatch = coupon.applicableCategories?.some((c) => toIdString(c) === catIdStr);
          const isColMatch = coupon.applicableCollections?.some((col) => colIdStrs.includes(toIdString(col)));

          return Boolean(isProdMatch || isCatMatch || isColMatch);
        });

        if (matchingItems.length === 0) {
          throw new ValidationError(`Coupon '${codeUpper}' is not applicable to any pieces in your current cart.`);
        }

        eligibleSubtotal = matchingItems.reduce((acc, i) => acc + i.lineTotalPaise, 0);
      }

      // Calculate coupon discount amount
      if (coupon.discountType === 'PERCENTAGE') {
        couponDiscountPaise = Math.round((eligibleSubtotal * coupon.discountValue) / 100);
        if (coupon.maxDiscountLimitPaise && couponDiscountPaise > coupon.maxDiscountLimitPaise) {
          couponDiscountPaise = coupon.maxDiscountLimitPaise;
        }
      } else if (coupon.discountType === 'FLAT_PAISE') {
        couponDiscountPaise = Math.min(coupon.discountValue, eligibleSubtotal);
      }

      // Prevent total discount from exceeding subtotal
      const maxPermittedCoupon = Math.max(0, subtotalPaise - offerDiscountPaise);
      couponDiscountPaise = Math.min(couponDiscountPaise, maxPermittedCoupon);

      appliedCoupon = {
        id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountPaise: couponDiscountPaise
      };
    }

    const totalDiscountPaise = offerDiscountPaise + couponDiscountPaise;
    const taxableAmountPaise = Math.max(0, subtotalPaise - totalDiscountPaise);

    // 5. Taxes (Standard 3% GST on Fine Jewellery in India)
    const gstRate = 3;
    const gstPaise = taxableAmountPaise > 0 ? Math.round((taxableAmountPaise * gstRate) / 100) : 0;

    // 6. Insured Luxury Shipping
    // Orders >= ₹50,000 (5,000,000 paise) receive complimentary white-glove vault delivery
    let shippingFeePaise = 0;
    if (customShippingFeePaise !== null) {
      shippingFeePaise = customShippingFeePaise;
    } else if (subtotalPaise > 0) {
      shippingFeePaise = subtotalPaise >= 5000000 ? 0 : 50000; // ₹500 for orders < ₹50k
    }

    // 7. Final Grand Total (Exact Integer Minor Units)
    const grandTotalPaise = taxableAmountPaise + gstPaise + shippingFeePaise;

    // Clean internal product references from item output
    const cleanItems = lineItems.map((item) => {
      const rest = { ...item };
      delete rest.productRef;
      return rest;
    });

    const variantSavingsPaise = lineItems.reduce(
      (acc, i) => acc + (Math.max(0, (i.originalPricePaise - i.unitPricePaise)) * (i.quantity || 1)),
      0
    );
    const totalSavingsPaise = totalDiscountPaise + variantSavingsPaise;

    return {
      items: cleanItems,
      pricing: {
        subtotalPaise,
        makingChargesPaise,
        offerDiscountPaise,
        couponDiscountPaise,
        totalDiscountPaise,
        discountPaise: totalDiscountPaise,
        totalSavingsPaise,
        taxableAmountPaise,
        gstRate,
        gstPaise,
        shippingFeePaise,
        grandTotalPaise
      },
      appliedOffer,
      appliedCoupon,
      warnings
    };
  },

  async calculateCartPricing(items = [], couponCode = null, userId = null) {
    const res = await this.calculateCartPrice(items, { couponCode, userId });
    return {
      ...res.pricing,
      items: res.items,
      appliedOffer: res.appliedOffer,
      appliedCoupon: res.appliedCoupon,
      warnings: res.warnings
    };
  },

  /**
   * Determine the best active promotional offer applicable to a given product.
   * Authoritative backend matching against category, collection, product ID, or storewide scope.
   */
  async getApplicableOfferForProduct(product, activeOffers = null) {
    if (!product) return null;

    const offers = activeOffers || (await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).sort({ priority: -1, createdAt: -1 }).lean());

    if (!offers || offers.length === 0) return null;

    const prodIdStr = product._id ? product._id.toString() : '';
    const catIdStr = product.categoryId
      ? (product.categoryId._id ? product.categoryId._id.toString() : product.categoryId.toString())
      : (product.category ? (product.category._id ? product.category._id.toString() : product.category.toString()) : '');
    const colIdStrs = (product.collectionIds || product.collections || []).map(
      (c) => (c._id ? c._id.toString() : c.toString())
    );

    for (const offer of offers) {
      let isMatch = false;
      if (offer.offerType === 'STOREWIDE') {
        isMatch = true;
      } else {
        if (prodIdStr && offer.applicableProducts?.some((p) => (p._id ? p._id.toString() : p.toString()) === prodIdStr)) {
          isMatch = true;
        } else if (catIdStr && offer.applicableCategories?.some((c) => (c._id ? c._id.toString() : c.toString()) === catIdStr)) {
          isMatch = true;
        } else if (colIdStrs.length > 0 && offer.applicableCollections?.some((col) => colIdStrs.includes(col._id ? col._id.toString() : col.toString()))) {
          isMatch = true;
        }
      }

      if (isMatch) {
        const badgeText = offer.discountType === 'PERCENTAGE'
          ? `${offer.discountValue}% OFF`
          : `SAVE ₹${(offer.discountValue / 100).toLocaleString('en-IN')}`;

        return {
          id: offer._id,
          title: offer.title,
          slug: offer.slug,
          description: offer.description,
          discountType: offer.discountType,
          discountValue: offer.discountValue,
          offerType: offer.offerType,
          badgeText,
          minOrderValuePaise: offer.minOrderValuePaise || 0,
          maxDiscountPaise: offer.maxDiscountPaise || null,
          allowStackingWithCoupons: Boolean(offer.allowStackingWithCoupons),
          bannerUrl: offer.bannerUrl || ''
        };
      }
    }

    return null;
  }
};

