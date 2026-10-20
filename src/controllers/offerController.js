import { offerService } from '../services/offerService.js';
import { sendResponse } from '../utils/ApiResponse.js';

export const offerController = {
  /**
   * Create promotional offer (Admin).
   */
  async createOffer(req, res) {
    const offer = await offerService.createOffer(req.body);

    sendResponse(res, {
      statusCode: 201,
      message: 'Offer created successfully.',
      data: { offer }
    });
  },

  /**
   * List all offers with pagination (Admin).
   */
  async getOffers(req, res) {
    const { isActive, offerType, page, limit } = req.query;
    const result = await offerService.getOffers({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      offerType,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20
    });

    sendResponse(res, {
      message: 'Offers retrieved successfully.',
      data: result
    });
  },

  /**
   * Retrieve active promotional offers (Public).
   */
  async getActiveOffers(req, res) {
    const offers = await offerService.getActiveOffers();

    sendResponse(res, {
      message: 'Active promotional offers retrieved successfully.',
      data: { offers, count: offers.length }
    });
  },

  /**
   * Retrieve single offer by ID or slug (Public/Admin).
   */
  async getOffer(req, res) {
    const { idOrSlug } = req.params;
    const offer = await offerService.getOfferByIdOrSlug(idOrSlug);

    sendResponse(res, {
      message: 'Offer retrieved successfully.',
      data: { offer }
    });
  },

  /**
   * Update offer (Admin).
   */
  async updateOffer(req, res) {
    const { id } = req.params;
    const offer = await offerService.updateOffer(id, req.body);

    sendResponse(res, {
      message: 'Offer updated successfully.',
      data: { offer }
    });
  },

  /**
   * Delete offer (Admin).
   */
  async deleteOffer(req, res) {
    const { id } = req.params;
    const result = await offerService.deleteOffer(id);

    sendResponse(res, {
      message: 'Offer deleted successfully.',
      data: result
    });
  }
};
