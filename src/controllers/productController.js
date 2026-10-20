import { productService } from '../services/productService.js';
import { recordAuditLog } from '../services/auditService.js';
import { sendResponse } from '../utils/ApiResponse.js';

export const productController = {
  /**
   * Search and filter product catalog.
   */
  async getCatalog(req, res) {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);
    const result = await productService.getCatalog(req.query, { isCustomer: !isAdmin });

    sendResponse(res, {
      message: 'Catalog products retrieved successfully.',
      data: result
    });
  },

  /**
   * Best sellers ranked strictly by completed order sales.
   */
  async getBestsellers(req, res) {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const result = await productService.getRealBestsellers({ limit });

    sendResponse(res, {
      message: 'Bestseller products retrieved successfully.',
      data: result
    });
  },

  /**
   * New arrivals collection.
   */
  async getNewArrivals(req, res) {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const products = await productService.getNewArrivals({ limit });

    sendResponse(res, {
      message: 'New arrivals retrieved successfully.',
      data: { products, count: products.length }
    });
  },

  /**
   * Real Trending products ranked by multi-dimensional customer engagement metrics.
   */
  async getTrending(req, res) {
    const limit = req.query.limit ? Number(req.query.limit) : 8;
    const result = await productService.getRealTrending({ limit });

    sendResponse(res, {
      message: 'Trending products retrieved successfully.',
      data: result
    });
  },

  /**
   * Telemetric product view recording.
   */
  async trackProductView(req, res) {
    const { idOrSlug } = req.params;
    const product = await productService.recordProductView(idOrSlug);

    sendResponse(res, {
      message: 'Product view recorded.',
      data: { id: product?._id, viewCount: product?.engagement?.viewCount || 0 }
    });
  },

  /**
   * Single product details with populated variants and relationships.
   */
  async getProduct(req, res) {
    const { idOrSlug } = req.params;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);
    const product = await productService.getProductByIdOrSlug(idOrSlug, { isCustomer: !isAdmin });

    sendResponse(res, {
      message: 'Product retrieved successfully.',
      data: { product }
    });
  },

  /**
   * Related products based on catalog relationships.
   */
  async getRelatedProducts(req, res) {
    const { idOrSlug } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 8;
    const products = await productService.getRelatedProducts(idOrSlug, { limit });

    sendResponse(res, {
      message: 'Related products retrieved successfully.',
      data: { products, count: products.length }
    });
  },

  /**
   * Create product master (Admin).
   */
  async createProduct(req, res) {
    const product = await productService.createProduct(req.body);

    sendResponse(res, {
      statusCode: 201,
      message: 'Product created successfully.',
      data: { product }
    });
  },

  /**
   * Update product master (Admin).
   */
  async updateProduct(req, res) {
    const { idOrSlug } = req.params;
    const product = await productService.updateProduct(idOrSlug, req.body);

    if (req.user?._id && req.body.status) {
      await recordAuditLog({
        action: 'PUBLICATION_STATUS_CHANGED',
        entity: 'Product',
        entityId: product._id,
        performedBy: req.user._id,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || '',
        changes: { after: { status: product.status } },
        metadata: { slug: product.slug, title: product.title }
      });
    }

    sendResponse(res, {
      message: 'Product updated successfully.',
      data: { product }
    });
  },

  /**
   * Delete product with safety verification (Admin).
   */
  async deleteProduct(req, res) {
    const { idOrSlug } = req.params;
    const result = await productService.deleteProduct(idOrSlug);

    sendResponse(res, {
      message: 'Product deleted successfully.',
      data: result
    });
  },

  /**
   * Update rich media assets (Admin).
   */
  async updateMedia(req, res) {
    const { idOrSlug } = req.params;
    const product = await productService.updateMedia(idOrSlug, req.body);

    sendResponse(res, {
      message: 'Product media updated successfully.',
      data: { product }
    });
  },

  /**
   * Create variant for product (Admin).
   */
  async createVariant(req, res) {
    const { idOrSlug } = req.params;
    const variant = await productService.createVariant(idOrSlug, req.body, req.user);

    sendResponse(res, {
      statusCode: 201,
      message: 'Product variant created successfully.',
      data: { variant }
    });
  },

  /**
   * Update product variant (Admin).
   */
  async updateVariant(req, res) {
    const { variantId } = req.params;
    const variant = await productService.updateVariant(variantId, req.body);

    sendResponse(res, {
      message: 'Product variant updated successfully.',
      data: { variant }
    });
  },

  /**
   * Delete product variant (Admin).
   */
  async deleteVariant(req, res) {
    const { variantId } = req.params;
    const result = await productService.deleteVariant(variantId);

    sendResponse(res, {
      message: 'Product variant deleted successfully.',
      data: result
    });
  },

  /**
   * Stock adjustment with audit history (Admin).
   */
  async adjustStock(req, res) {
    const { variantId } = req.params;
    const { adjustment, reason } = req.body;
    const result = await productService.adjustStock(variantId, {
      adjustment,
      reason,
      performedBy: req.user?._id
    });

    if (req.user?._id) {
      await recordAuditLog({
        action: 'INVENTORY_ADJUSTED',
        entity: 'ProductVariant',
        entityId: variantId,
        performedBy: req.user._id,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || '',
        changes: {
          before: { inventoryCount: result.log.previousQuantity },
          after: { inventoryCount: result.log.newQuantity }
        },
        metadata: {
          variantId,
          sku: result.variant?.sku,
          adjustment,
          reason
        }
      });
    }

    sendResponse(res, {
      message: 'Stock adjusted successfully.',
      data: result
    });
  },

  /**
   * Stock reservation (Checkout hold).
   */
  async reserveStock(req, res) {
    const { variantId } = req.params;
    const { quantity } = req.body;
    const result = await productService.reserveStock(variantId, quantity, {
      performedBy: req.user?._id
    });

    sendResponse(res, {
      message: 'Stock reserved successfully.',
      data: result
    });
  },

  /**
   * Release reserved stock.
   */
  async releaseStock(req, res) {
    const { variantId } = req.params;
    const { quantity } = req.body;
    const result = await productService.releaseStock(variantId, quantity, {
      performedBy: req.user?._id
    });

    sendResponse(res, {
      message: 'Stock reservation released successfully.',
      data: result
    });
  }
};
