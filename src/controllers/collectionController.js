import { collectionService } from '../services/collectionService.js';
import { sendResponse } from '../utils/ApiResponse.js';

export const collectionController = {
  /**
   * List collections (public or admin).
   */
  async getCollections(req, res) {
    const { status, isFeatured, includeArchived, page, limit } = req.query;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);

    // If not admin and status not specified, default to ACTIVE
    const effectiveStatus = (!isAdmin && !status) ? 'ACTIVE' : status;
    const allowArchived = isAdmin ? includeArchived === true : false;

    const result = await collectionService.getCollections({
      status: effectiveStatus,
      isFeatured,
      includeArchived: allowArchived,
      page,
      limit
    });

    sendResponse(res, {
      message: 'Collections retrieved successfully.',
      data: result
    });
  },

  /**
   * Retrieve single collection by ID or slug.
   */
  async getCollection(req, res) {
    const { idOrSlug } = req.params;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);

    const collection = await collectionService.getCollectionByIdOrSlug(idOrSlug, {
      includeArchived: isAdmin
    });

    sendResponse(res, {
      message: 'Collection retrieved successfully.',
      data: { collection }
    });
  },

  /**
   * Retrieve products in collection.
   */
  async getCollectionProducts(req, res) {
    const { idOrSlug } = req.params;
    const { page, limit } = req.query;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);

    const result = await collectionService.getCollectionProducts(idOrSlug, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      isCustomer: !isAdmin
    });

    sendResponse(res, {
      message: 'Collection products retrieved successfully.',
      data: result
    });
  },

  /**
   * Create collection (Admin).
   */
  async createCollection(req, res) {
    const collection = await collectionService.createCollection(req.body);

    sendResponse(res, {
      statusCode: 201,
      message: 'Collection created successfully.',
      data: { collection }
    });
  },

  /**
   * Update collection (Admin).
   */
  async updateCollection(req, res) {
    const { idOrSlug } = req.params;
    const collection = await collectionService.updateCollection(idOrSlug, req.body);

    sendResponse(res, {
      message: 'Collection updated successfully.',
      data: { collection }
    });
  },

  /**
   * Update collection status (Admin).
   */
  async setStatus(req, res) {
    const { idOrSlug } = req.params;
    const { status } = req.body;
    const collection = await collectionService.setStatus(idOrSlug, status);

    sendResponse(res, {
      message: `Collection status updated to ${status}.`,
      data: { collection }
    });
  },

  /**
   * Delete collection (Admin).
   */
  async deleteCollection(req, res) {
    const { idOrSlug } = req.params;
    const result = await collectionService.deleteCollection(idOrSlug);

    sendResponse(res, {
      message: 'Collection deleted successfully.',
      data: result
    });
  },

  /**
   * Associate products with collection (Admin).
   */
  async addProducts(req, res) {
    const { idOrSlug } = req.params;
    const { productIds } = req.body;
    const result = await collectionService.addProductsToCollection(idOrSlug, productIds);

    sendResponse(res, {
      message: 'Products associated with collection successfully.',
      data: result
    });
  },

  /**
   * Disassociate products from collection (Admin).
   */
  async removeProducts(req, res) {
    const { idOrSlug } = req.params;
    const { productIds } = req.body;
    const result = await collectionService.removeProductsFromCollection(idOrSlug, productIds);

    sendResponse(res, {
      message: 'Products removed from collection successfully.',
      data: result
    });
  }
};
