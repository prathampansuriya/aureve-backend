import mongoose from 'mongoose';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Category } from '../models/Category.js';
import { Collection } from '../models/Collection.js';
import { Coupon } from '../models/Coupon.js';
import { pricingService } from './pricingService.js';
import { NotFoundError, ValidationError } from '../utils/AppError.js';

export const cartService = {
  /**
   * Helper to locate or instantiate a cart for an authenticated user or guest.
   */
  async findOrCreateCart(userId = null, guestToken = null) {
    let resolvedGuestToken = guestToken;
    if (!userId && !resolvedGuestToken) {
      resolvedGuestToken = `gst_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
    }

    let cart = null;
    if (userId) {
      cart = await Cart.findOne({ userId });
    } else if (resolvedGuestToken) {
      cart = await Cart.findOne({ guestToken: resolvedGuestToken });
    }

    if (!cart) {
      const cartData = { items: [] };
      if (userId) {
        cartData.userId = userId;
      } else {
        cartData.guestToken = resolvedGuestToken;
      }
      cart = new Cart(cartData);
    }

    return cart;
  },

  /**
   * Retrieve active cart with authoritative live pricing, stock validation, and coupon calculation.
   */
  async getCart(userId = null, guestToken = null) {
    if (!userId && !guestToken) {
      return {
        cartId: null,
        userId: null,
        guestToken: null,
        items: [],
        itemCount: 0,
        pricing: {
          subtotalPaise: 0,
          makingChargesPaise: 0,
          offerDiscountPaise: 0,
          couponDiscountPaise: 0,
          totalDiscountPaise: 0,
          gstPaise: 0,
          shippingFeePaise: 0,
          grandTotalPaise: 0
        },
        appliedOffer: null,
        appliedCoupon: null,
        giftWrapping: false,
        warnings: []
      };
    }

    const cart = await this.findOrCreateCart(userId, guestToken);

    // If a coupon is assigned to the cart, retrieve its code
    let couponCode = cart.appliedCouponCode || null;
    if (cart.couponId) {
      const couponDoc = await Coupon.findById(cart.couponId);
      if (couponDoc && couponDoc.isValidNow()) {
        couponCode = couponDoc.code;
        cart.appliedCouponCode = couponDoc.code;
      } else {
        // Discard expired or inactive coupon
        cart.couponId = null;
        cart.appliedCouponCode = null;
        couponCode = null;
      }
    } else if (couponCode) {
      const couponDoc = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (couponDoc && couponDoc.isValidNow()) {
        cart.couponId = couponDoc._id;
      } else {
        cart.appliedCouponCode = null;
        couponCode = null;
      }
    }

    // Authoritative calculation
    let calculated;
    try {
      calculated = await pricingService.calculateCartPrice(cart.items, {
        couponCode,
        userId
      });
    } catch (err) {
      // If previously applied coupon became invalid (e.g. subtotal changed below min threshold), drop coupon gracefully
      if (couponCode && err instanceof ValidationError) {
        cart.couponId = null;
        cart.appliedCouponCode = null;
        calculated = await pricingService.calculateCartPrice(cart.items, {
          couponCode: null,
          userId
        });
        calculated.warnings.push(`Previously applied coupon '${couponCode}' was removed: ${err.message}`);
      } else {
        throw err;
      }
    }

    // Persist latest financial snapshots on Cart record
    cart.subtotalPaise = calculated.pricing.subtotalPaise;
    cart.makingChargesPaise = calculated.pricing.makingChargesPaise;
    cart.discountPaise = calculated.pricing.totalDiscountPaise;
    cart.gstPaise = calculated.pricing.gstPaise;
    cart.totalPaise = calculated.pricing.grandTotalPaise;

    await cart.save();

    return {
      cartId: cart._id,
      userId: cart.userId,
      guestToken: cart.guestToken,
      items: calculated.items,
      itemCount: calculated.items.reduce((sum, item) => sum + (item.isAvailable ? item.quantity : 0), 0),
      pricing: calculated.pricing,
      appliedOffer: calculated.appliedOffer,
      appliedCoupon: calculated.appliedCoupon,
      giftWrapping: cart.giftWrapping,
      warnings: calculated.warnings
    };
  },

  /**
   * Add a product variant to the cart with live stock validation.
   */
  async addItem(userId = null, guestToken = null, { variantId, productId, quantity = 1 }) {
    let resolvedVariantId = variantId;

    if (!resolvedVariantId && productId) {
      if (!mongoose.isValidObjectId(productId)) {
        throw new ValidationError('Invalid product ID.');
      }
      const activeVariant =
        (await ProductVariant.findOne({ productId, isActive: true, inventoryCount: { $gt: 0 } })) ||
        (await ProductVariant.findOne({ productId, isActive: true }));
      if (activeVariant) {
        resolvedVariantId = activeVariant._id.toString();
      }
    }

    if (!resolvedVariantId || !mongoose.isValidObjectId(resolvedVariantId)) {
      throw new ValidationError('A valid jewellery variant ID is required.');
    }

    const qty = Math.max(1, Math.min(Number(quantity) || 1, 5));

    const variant = await ProductVariant.findById(resolvedVariantId);
    if (!variant || variant.isActive === false) {
      throw new NotFoundError('Jewellery variant is inactive or not found.');
    }

    const product = await Product.findById(variant.productId);
    if (!product || product.status !== 'PUBLISHED') {
      throw new ValidationError('This creation is not currently published for purchase.');
    }

    const availableStock = Math.max(0, variant.inventoryCount - variant.reservedCount);
    if (availableStock < qty) {
      throw new ValidationError(
        `Insufficient inventory. Only ${availableStock} unit(s) available for '${product.title} (${variant.variantName})'.`
      );
    }

    const cart = await this.findOrCreateCart(userId, guestToken);

    // Check if variant already exists in cart
    const existingIndex = cart.items.findIndex((item) => item.variantId.toString() === resolvedVariantId.toString());

    if (existingIndex > -1) {
      const newTotalQty = cart.items[existingIndex].quantity + qty;
      if (newTotalQty > 5) {
        throw new ValidationError('Maximum of 5 units allowed per high-value luxury creation.');
      }
      if (newTotalQty > availableStock) {
        throw new ValidationError(`Cannot add ${qty} more. Total in cart would exceed available stock of ${availableStock}.`);
      }
      cart.items[existingIndex].quantity = newTotalQty;
      cart.items[existingIndex].priceInPaise = variant.discountPriceInPaise || variant.priceInPaise;
    } else {
      cart.items.push({
        productId: product._id,
        variantId: variant._id,
        quantity: qty,
        priceInPaise: variant.discountPriceInPaise || variant.priceInPaise,
        addedAt: new Date()
      });
    }

    await cart.save();
    return this.getCart(userId, guestToken);
  },

  /**
   * Update quantity of a variant already in the cart.
   */
  async updateItemQuantity(userId = null, guestToken = null, variantId, quantity) {
    if (!mongoose.isValidObjectId(variantId)) {
      throw new ValidationError('Invalid variant ID.');
    }

    const qty = Math.max(1, Math.min(Number(quantity), 5));

    const cart = await this.findOrCreateCart(userId, guestToken);
    const itemIndex = cart.items.findIndex((item) => item.variantId.toString() === variantId.toString());

    if (itemIndex === -1) {
      throw new NotFoundError('Item not found in your cart.');
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant || variant.isActive === false) {
      // Remove stale unavailable item
      cart.items.splice(itemIndex, 1);
      await cart.save();
      throw new ValidationError('Item is no longer available and has been removed from your cart.');
    }

    const availableStock = Math.max(0, variant.inventoryCount - variant.reservedCount);
    if (availableStock < qty) {
      throw new ValidationError(
        `Requested quantity (${qty}) exceeds currently available unreserved stock (${availableStock}).`
      );
    }

    cart.items[itemIndex].quantity = qty;
    cart.items[itemIndex].priceInPaise = variant.discountPriceInPaise || variant.priceInPaise;

    await cart.save();
    return this.getCart(userId, guestToken);
  },

  /**
   * Remove a line item from the cart.
   */
  async removeItem(userId = null, guestToken = null, variantId) {
    if (!mongoose.isValidObjectId(variantId)) {
      throw new ValidationError('Invalid variant ID.');
    }

    const cart = await this.findOrCreateCart(userId, guestToken);
    cart.items = cart.items.filter((item) => item.variantId.toString() !== variantId.toString());

    await cart.save();
    return this.getCart(userId, guestToken);
  },

  /**
   * Empty all items from the cart.
   */
  async clearCart(userId = null, guestToken = null) {
    const cart = await this.findOrCreateCart(userId, guestToken);
    cart.items = [];
    cart.couponId = null;
    cart.appliedCouponCode = null;
    cart.subtotalPaise = 0;
    cart.makingChargesPaise = 0;
    cart.discountPaise = 0;
    cart.gstPaise = 0;
    cart.totalPaise = 0;

    await cart.save();
    return this.getCart(userId, guestToken);
  },

  /**
   * Apply promotional coupon code to cart.
   */
  async applyCoupon(userId = null, guestToken = null, code) {
    if (!code || typeof code !== 'string') {
      throw new ValidationError('Coupon code is required.');
    }

    const codeUpper = code.trim().toUpperCase();
    const cart = await this.findOrCreateCart(userId, guestToken);

    if (cart.items.length === 0) {
      throw new ValidationError('Cannot apply coupon to an empty cart.');
    }

    // Verify and calculate coupon impact through authoritative pricing service
    const calculated = await pricingService.calculateCartPrice(cart.items, {
      couponCode: codeUpper,
      userId
    });

    if (!calculated.appliedCoupon) {
      throw new ValidationError(`Coupon '${codeUpper}' could not be applied.`);
    }

    cart.couponId = calculated.appliedCoupon.id;
    cart.appliedCouponCode = calculated.appliedCoupon.code;
    await cart.save();

    return this.getCart(userId, guestToken);
  },

  /**
   * Remove applied coupon code from cart.
   */
  async removeCoupon(userId = null, guestToken = null) {
    const cart = await this.findOrCreateCart(userId, guestToken);
    cart.couponId = null;
    cart.appliedCouponCode = null;
    await cart.save();

    return this.getCart(userId, guestToken);
  },

  /**
   * Secure Guest Cart Merge: transfers guest cart items into authenticated user's cart upon login.
   * Enforces stock availability and caps item quantities to prevent overselling.
   */
  async mergeGuestCart(userId, guestToken) {
    if (!userId || !guestToken) {
      throw new ValidationError('User ID and guest token are required for cart migration.');
    }

    const guestCart = await Cart.findOne({ guestToken });
    if (!guestCart || guestCart.items.length === 0) {
      return this.getCart(userId, null);
    }

    let userCart = await Cart.findOne({ userId });
    if (!userCart) {
      userCart = new Cart({ userId, items: [] });
    }

    // Merge each item
    for (const gItem of guestCart.items) {
      const variant = await ProductVariant.findById(gItem.variantId);
      if (!variant || variant.isActive === false) continue;

      const availableStock = Math.max(0, variant.inventoryCount - variant.reservedCount);
      if (availableStock <= 0) continue;

      const existingIndex = userCart.items.findIndex(
        (uItem) => uItem.variantId.toString() === gItem.variantId.toString()
      );

      if (existingIndex > -1) {
        const combined = userCart.items[existingIndex].quantity + gItem.quantity;
        userCart.items[existingIndex].quantity = Math.max(1, Math.min(5, Math.min(combined, availableStock)));
      } else {
        const addQty = Math.max(1, Math.min(5, Math.min(gItem.quantity, availableStock)));
        userCart.items.push({
          productId: gItem.productId,
          variantId: gItem.variantId,
          quantity: addQty,
          priceInPaise: variant.discountPriceInPaise || variant.priceInPaise,
          addedAt: new Date()
        });
      }
    }

    // If guest had an applied coupon and user didn't, carry it over
    if ((guestCart.couponId || guestCart.appliedCouponCode) && !userCart.couponId && !userCart.appliedCouponCode) {
      userCart.couponId = guestCart.couponId;
      userCart.appliedCouponCode = guestCart.appliedCouponCode;
    }

    await userCart.save();

    // Remove obsolete guest cart record
    await Cart.deleteOne({ _id: guestCart._id });

    return this.getCart(userId, null);
  }
};
