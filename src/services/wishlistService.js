import mongoose from 'mongoose';
import { Wishlist } from '../models/Wishlist.js';
import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Category } from '../models/Category.js';
import { Collection } from '../models/Collection.js';
import { cartService } from './cartService.js';
import { NotFoundError, ValidationError } from '../utils/AppError.js';

export const wishlistService = {
  /**
   * Retrieve customer's saved wishlist with populated availability and live pricing.
   */
  async getWishlist(userId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new ValidationError('Invalid user ID.');
    }

    let wishlist = await Wishlist.findOne({ userId })
      .populate({
        path: 'items.productId',
        select: 'title slug pricing images status availability categoryId collectionIds'
      })
      .populate({
        path: 'items.variantId',
        select: 'variantName sku metalType metalPurity size priceInPaise discountPriceInPaise inventoryCount reservedCount availability'
      });

    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, items: [] });
    }

    const formattedItems = wishlist.items.map((item) => {
      const prod = item.productId;
      const variant = item.variantId;

      const isPublished = prod && prod.status === 'PUBLISHED';
      const availableStock = variant ? Math.max(0, variant.inventoryCount - variant.reservedCount) : 0;
      const isAvailable = isPublished && (!variant || availableStock > 0);

      return {
        _id: item._id,
        productId: prod ? prod._id : null,
        title: prod ? prod.title : 'Unknown Piece',
        slug: prod ? prod.slug : '',
        image: prod?.images?.[0]?.url || '',
        variantId: variant ? variant._id : null,
        variantName: variant ? variant.variantName : '',
        sku: variant ? variant.sku : '',
        priceInPaise: variant
          ? (variant.discountPriceInPaise || variant.priceInPaise)
          : (prod?.pricing?.calculatedPricePaise || prod?.pricePaise || prod?.pricing?.baseMetalPricePaise || 0),
        availableStock,
        isAvailable,
        addedAt: item.addedAt
      };
    });

    return {
      wishlistId: wishlist._id,
      items: formattedItems,
      count: formattedItems.length
    };
  },

  /**
   * Add a jewellery masterpiece to customer's wishlist.
   * Prevents duplicates idempotently.
   */
  async addItem(userId, { productId, variantId = null }) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(productId)) {
      throw new ValidationError('Invalid user ID or product ID.');
    }

    const product = await Product.findById(productId);
    if (!product || product.status === 'ARCHIVED') {
      throw new NotFoundError('Product not found or is no longer available in the catalogue.');
    }

    if (variantId) {
      if (!mongoose.isValidObjectId(variantId)) {
        throw new ValidationError('Invalid variant ID.');
      }
      const variant = await ProductVariant.findOne({ _id: variantId, productId });
      if (!variant) {
        throw new NotFoundError('Variant not found for this product.');
      }
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [] });
    }

    // Check for existing duplicate
    const isDuplicate = wishlist.items.some((item) => {
      const sameProduct = item.productId.toString() === productId.toString();
      const sameVariant =
        (!item.variantId && !variantId) ||
        (item.variantId && variantId && item.variantId.toString() === variantId.toString());
      return sameProduct && sameVariant;
    });

    if (!isDuplicate) {
      wishlist.items.unshift({
        productId,
        variantId: variantId || null,
        addedAt: new Date()
      });
      await wishlist.save();
    }

    return this.getWishlist(userId);
  },

  /**
   * Remove item from customer's wishlist.
   */
  async removeItem(userId, { productId, variantId = null }) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(productId)) {
      throw new ValidationError('Invalid user ID or product ID.');
    }

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return { wishlistId: null, items: [], count: 0 };
    }

    wishlist.items = wishlist.items.filter((item) => {
      if (item.productId.toString() !== productId.toString()) {
        return true;
      }
      if (variantId && item.variantId && item.variantId.toString() !== variantId.toString()) {
        return true;
      }
      return false;
    });

    await wishlist.save();
    return this.getWishlist(userId);
  },

  /**
   * Move an item directly from wishlist to cart.
   */
  async moveToCart(userId, { productId, variantId, quantity = 1 }) {
    if (!variantId) {
      throw new ValidationError('A specific jewellery variant is required to add to cart.');
    }

    // 1. Add to user's cart
    const cartResult = await cartService.addItem(userId, null, { variantId, quantity });

    // 2. Remove from wishlist
    await this.removeItem(userId, { productId, variantId });

    return {
      message: 'Item moved from wishlist to cart successfully.',
      cart: cartResult
    };
  }
};
