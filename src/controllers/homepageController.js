import { homepageService } from '../services/homepageService.js';
import { sendResponse } from '../utils/ApiResponse.js';

export const homepageController = {
  /**
   * Get dynamic homepage content feed (Public).
   */
  async getHomepage(req, res) {
    const feed = await homepageService.getPublicHomepage();

    sendResponse(res, {
      message: 'Homepage feed retrieved successfully.',
      data: feed
    });
  },

  /**
   * List all banners (Admin).
   */
  async getBanners(req, res) {
    const { placement, isActive } = req.query;
    const banners = await homepageService.getBanners({
      placement,
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    });

    sendResponse(res, {
      message: 'Banners retrieved successfully.',
      data: { banners, count: banners.length }
    });
  },

  /**
   * Create banner (Admin).
   */
  async createBanner(req, res) {
    const banner = await homepageService.createBanner(req.body);

    sendResponse(res, {
      statusCode: 201,
      message: 'Banner created successfully.',
      data: { banner }
    });
  },

  /**
   * Update banner (Admin).
   */
  async updateBanner(req, res) {
    const { id } = req.params;
    const banner = await homepageService.updateBanner(id, req.body);

    sendResponse(res, {
      message: 'Banner updated successfully.',
      data: { banner }
    });
  },

  /**
   * Delete banner (Admin).
   */
  async deleteBanner(req, res) {
    const { id } = req.params;
    const result = await homepageService.deleteBanner(id);

    sendResponse(res, {
      message: 'Banner deleted successfully.',
      data: result
    });
  },

  /**
   * List homepage sections (Admin).
   */
  async getSections(req, res) {
    const { isActive } = req.query;
    const sections = await homepageService.getSections({
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    });

    sendResponse(res, {
      message: 'Homepage sections retrieved successfully.',
      data: { sections, count: sections.length }
    });
  },

  /**
   * Create homepage section (Admin).
   */
  async createSection(req, res) {
    const section = await homepageService.createSection(req.body);

    sendResponse(res, {
      statusCode: 201,
      message: 'Homepage section created successfully.',
      data: { section }
    });
  },

  /**
   * Update homepage section (Admin).
   */
  async updateSection(req, res) {
    const { id } = req.params;
    const section = await homepageService.updateSection(id, req.body);

    sendResponse(res, {
      message: 'Homepage section updated successfully.',
      data: { section }
    });
  },

  /**
   * Delete homepage section (Admin).
   */
  async deleteSection(req, res) {
    const { id } = req.params;
    const result = await homepageService.deleteSection(id);

    sendResponse(res, {
      message: 'Homepage section deleted successfully.',
      data: result
    });
  }
};
