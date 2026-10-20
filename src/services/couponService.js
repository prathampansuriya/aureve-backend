import mongoose from 'mongoose';
import { Coupon } from '../models/Coupon.js';
import { pricingService } from './pricingService.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/AppError.js';

export const couponService = {
  /**
   * Create a new promotional coupon (Admin).
   */
  async createCoupon(data) {
    const code = data.code.trim().toUpperCase();
    const existing = await Coupon.findOne({ code });

    if (existing) {
      throw new ConflictError(`Coupon with code '${code}' already exists.`);
    }

    const coupon = await Coupon.create({
      ...data,
      code
    });

    return coupon;
  },

  /**
   * List coupons with pagination, search, type, and active status filter (Admin).
   */
  async getCoupons({ isActive, search, discountType, page = 1, limit = 50 } = {}) {
    const filter = {};
    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }
    if (search && search.trim()) {
      filter.$or = [
        { code: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }
    if (discountType && discountType !== 'ALL') {
      filter.discountType = discountType;
    }

    const numericPage = Math.max(1, parseInt(page, 10) || 1);
    const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (numericPage - 1) * numericLimit;

    const [coupons, total] = await Promise.all([
      Coupon.find(filter)
        .populate('applicableCategories', 'name slug')
        .populate('applicableCollections', 'name slug')
        .populate('applicableProducts', 'title slug images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(numericLimit)
        .lean(),
      Coupon.countDocuments(filter)
    ]);

    return {
      coupons,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        totalPages: Math.ceil(total / numericLimit) || 1
      }
    };
  },

  /**
   * Get active public coupons available for storefront patrons and checkout.
   */
  async getAvailableCoupons() {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $expr: {
        $or: [
          { $eq: ['$usageLimitTotal', null] },
          { $lt: ['$usageCount', '$usageLimitTotal'] }
        ]
      }
    })
      .select('code description discountType discountValue minOrderValuePaise maxDiscountLimitPaise validUntil validFrom applicableCategories applicableCollections applicableProducts')
      .populate('applicableCategories', 'name slug')
      .populate('applicableCollections', 'name slug')
      .populate('applicableProducts', 'title slug images sku')
      .sort({ createdAt: -1 })
      .lean();

    return coupons;
  },

  /**
   * Retrieve single coupon with full redemption history (Admin).
   */
  async getCouponById(id) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid coupon ID.');
    }

    const coupon = await Coupon.findById(id)
      .populate('applicableCategories', 'name slug')
      .populate('applicableCollections', 'name slug')
      .populate('applicableProducts', 'title slug images sku')
      .populate('redemptions.userId', 'firstName lastName email');
    if (!coupon) {
      throw new NotFoundError('Coupon not found.');
    }

    return coupon;
  },

  /**
   * Update coupon parameters (Admin).
   */
  async updateCoupon(id, updateData) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid coupon ID.');
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw new NotFoundError('Coupon not found.');
    }

    if (updateData.code) {
      const newCode = updateData.code.trim().toUpperCase();
      const existing = await Coupon.findOne({ _id: { $ne: id }, code: newCode });
      if (existing) {
        throw new ConflictError(`Coupon code '${newCode}' is already in use.`);
      }
      updateData.code = newCode;
    }

    Object.assign(coupon, updateData);
    await coupon.save();

    return coupon;
  },

  /**
   * Delete coupon (Admin).
   */
  async deleteCoupon(id) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid coupon ID.');
    }

    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      throw new NotFoundError('Coupon not found.');
    }

    return { deletedId: id, code: coupon.code };
  },

  /**
   * Standalone coupon validation against arbitrary cart items or subtotal.
   */
  async validateCoupon({ code, items = [], _cartSubtotalPaise = 0, userId = null }) {
    if (!code) {
      throw new ValidationError('Coupon code is required for validation.');
    }

    const calculation = await pricingService.calculateCartPrice(items, {
      couponCode: code,
      userId
    });

    if (!calculation.appliedCoupon) {
      throw new ValidationError(`Coupon '${code.toUpperCase()}' is not valid for this purchase.`);
    }

    return {
      isValid: true,
      coupon: calculation.appliedCoupon,
      discountPaise: calculation.appliedCoupon.discountPaise,
      grandTotalPaise: calculation.pricing.grandTotalPaise
    };
  },

  /**
   * Record a verified redemption of a coupon upon successful checkout completion.
   */
  async recordRedemption(code, { userId, orderId = null, discountPaise = 0 }) {
    const codeUpper = code.trim().toUpperCase();

    const coupon = await Coupon.findOneAndUpdate(
      { code: codeUpper },
      {
        $inc: { usageCount: 1 },
        $push: {
          redemptions: {
            userId,
            orderId,
            discountPaise,
            redeemedAt: new Date()
          }
        }
      },
      { new: true }
    );

    return coupon;
  }
};
