import { wishlistService } from '../services/wishlistService.js';
import { sendResponse } from '../utils/ApiResponse.js';

export const wishlistController = {
  /**
   * Retrieve current user's saved wishlist.
   */
  async getWishlist(req, res) {
    const result = await wishlistService.getWishlist(req.user._id);

    sendResponse(res, {
      message: 'Wishlist retrieved successfully.',
      data: result
    });
  },

  /**
   * Add a piece to user's wishlist.
   */
  async addItem(req, res) {
    const result = await wishlistService.addItem(req.user._id, req.body);

    sendResponse(res, {
      statusCode: 201,
      message: 'Item added to wishlist successfully.',
      data: result
    });
  },

  /**
   * Remove a piece from user's wishlist.
   */
  async removeItem(req, res) {
    const { productId } = req.params;
    const { variantId } = req.query;

    const result = await wishlistService.removeItem(req.user._id, {
      productId,
      variantId
    });

    sendResponse(res, {
      message: 'Item removed from wishlist successfully.',
      data: result
    });
  },

  /**
   * Move an item directly from wishlist to cart.
   */
  async moveToCart(req, res) {
    const result = await wishlistService.moveToCart(req.user._id, req.body);

    sendResponse(res, {
      message: 'Item moved from wishlist to cart successfully.',
      data: result
    });
  }
};
