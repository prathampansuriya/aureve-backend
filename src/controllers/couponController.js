import { couponService } from '../services/couponService.js';
import { recordAuditLog } from '../services/auditService.js';
import { sendResponse } from '../utils/ApiResponse.js';

export const couponController = {
  /**
   * Create coupon (Admin).
   */
  async createCoupon(req, res) {
    const coupon = await couponService.createCoupon(req.body);

    if (req.user?._id) {
      await recordAuditLog({
        action: 'COUPON_CREATED',
        entity: 'Coupon',
        entityId: coupon._id,
        performedBy: req.user._id,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || '',
        changes: { after: coupon.toObject ? coupon.toObject() : coupon },
        metadata: { code: coupon.code, discountType: coupon.discountType }
      });
    }

    sendResponse(res, {
      statusCode: 201,
      message: 'Coupon created successfully.',
      data: { coupon }
    });
  },

  /**
   * List coupons with pagination (Admin).
   */
  async getCoupons(req, res) {
    const { isActive, search, discountType, page, limit } = req.query;
    const result = await couponService.getCoupons({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
      discountType,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50
    });

    sendResponse(res, {
      message: 'Coupons retrieved successfully.',
      data: result
    });
  },

  /**
   * Get single coupon with redemption audit logs (Admin).
   */
  async getCoupon(req, res) {
    const { id } = req.params;
    const coupon = await couponService.getCouponById(id);

    sendResponse(res, {
      message: 'Coupon retrieved successfully.',
      data: { coupon }
    });
  },

  /**
   * Update coupon (Admin).
   */
  async updateCoupon(req, res) {
    const { id } = req.params;
    const coupon = await couponService.updateCoupon(id, req.body);

    if (req.user?._id) {
      await recordAuditLog({
        action: 'COUPON_MODIFIED',
        entity: 'Coupon',
        entityId: coupon._id,
        performedBy: req.user._id,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || '',
        changes: { after: req.body },
        metadata: { code: coupon.code }
      });
    }

    sendResponse(res, {
      message: 'Coupon updated successfully.',
      data: { coupon }
    });
  },

  /**
   * Delete coupon (Admin).
   */
  async deleteCoupon(req, res) {
    const { id } = req.params;
    const result = await couponService.deleteCoupon(id);

    if (req.user?._id) {
      await recordAuditLog({
        action: 'COUPON_DELETED',
        entity: 'Coupon',
        entityId: id,
        performedBy: req.user._id,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || '',
        metadata: { code: result.code }
      });
    }

    sendResponse(res, {
      message: 'Coupon deleted successfully.',
      data: result
    });
  },

  /**
   * Validate coupon code against cart/order payload (Public/Authenticated).
   */
  async validateCoupon(req, res) {
    const { code, items, cartSubtotalPaise } = req.body;
    const userId = req.user?._id || null;

    const result = await couponService.validateCoupon({
      code,
      items,
      cartSubtotalPaise,
      userId
    });

    sendResponse(res, {
      message: 'Coupon code is valid.',
      data: result
    });
  },

  /**
   * List active public coupons for storefront patrons & checkout (Public/Authenticated).
   */
  async getAvailableCoupons(req, res) {
    const coupons = await couponService.getAvailableCoupons();

    sendResponse(res, {
      message: 'Available coupons retrieved successfully.',
      data: { coupons }
    });
  }
};
