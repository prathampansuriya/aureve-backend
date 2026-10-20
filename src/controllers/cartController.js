import { cartService } from '../services/cartService.js';
import { sendResponse } from '../utils/ApiResponse.js';

const getIdentifiers = (req) => {
  const userId = req.user?._id || null;
  const guestToken =
    req.headers['x-guest-token'] ||
    req.headers['guest-token'] ||
    req.headers['x-guest-session'] ||
    req.query.guestToken ||
    req.body?.guestToken ||
    null;
  return { userId, guestToken };
};

export const cartController = {
  /**
   * Retrieve active cart with authoritative live pricing.
   */
  async getCart(req, res) {
    const { userId, guestToken } = getIdentifiers(req);
    const result = await cartService.getCart(userId, guestToken);

    if (result?.guestToken) {
      res.setHeader('x-guest-token', result.guestToken);
    }

    sendResponse(res, {
      message: 'Cart retrieved successfully.',
      data: result
    });
  },

  /**
   * Add a product variant to the cart.
   */
  async addItem(req, res) {
    const { userId, guestToken } = getIdentifiers(req);
    const result = await cartService.addItem(userId, guestToken, req.body);

    sendResponse(res, {
      statusCode: 201,
      message: 'Item added to cart successfully.',
      data: result
    });
  },

  /**
   * Update item quantity in cart.
   */
  async updateItemQuantity(req, res) {
    const { userId, guestToken } = getIdentifiers(req);
    const { variantId } = req.params;
    const { quantity } = req.body;

    const result = await cartService.updateItemQuantity(userId, guestToken, variantId, quantity);

    sendResponse(res, {
      message: 'Cart item updated successfully.',
      data: result
    });
  },

  /**
   * Remove item from cart.
   */
  async removeItem(req, res) {
    const { userId, guestToken } = getIdentifiers(req);
    const { variantId } = req.params;

    const result = await cartService.removeItem(userId, guestToken, variantId);

    sendResponse(res, {
      message: 'Item removed from cart successfully.',
      data: result
    });
  },

  /**
   * Empty all items from cart.
   */
  async clearCart(req, res) {
    const { userId, guestToken } = getIdentifiers(req);
    const result = await cartService.clearCart(userId, guestToken);

    sendResponse(res, {
      message: 'Cart cleared successfully.',
      data: result
    });
  },

  /**
   * Apply promotional coupon to cart.
   */
  async applyCoupon(req, res) {
    const { userId, guestToken } = getIdentifiers(req);
    const { code } = req.body;

    const result = await cartService.applyCoupon(userId, guestToken, code);

    sendResponse(res, {
      message: 'Coupon applied to cart successfully.',
      data: result
    });
  },

  /**
   * Remove promotional coupon from cart.
   */
  async removeCoupon(req, res) {
    const { userId, guestToken } = getIdentifiers(req);
    const result = await cartService.removeCoupon(userId, guestToken);

    sendResponse(res, {
      message: 'Coupon removed from cart successfully.',
      data: result
    });
  },

  /**
   * Merge guest cart into authenticated customer's account upon login.
   */
  async mergeCart(req, res) {
    const { guestToken } = req.body;
    const result = await cartService.mergeGuestCart(req.user._id, guestToken);

    sendResponse(res, {
      message: 'Guest cart merged successfully into customer account.',
      data: result
    });
  }
};
