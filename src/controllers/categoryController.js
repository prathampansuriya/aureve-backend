import { categoryService } from '../services/categoryService.js';
import { sendResponse } from '../utils/ApiResponse.js';

export const categoryController = {
  /**
   * List all categories (public or administrative with filters).
   */
  async getCategories(req, res) {
    const { isActive, includeArchived, tree } = req.query;

    // Public customers can never view archived categories
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);
    const allowArchived = isAdmin ? includeArchived === true : false;

    const categories = await categoryService.getCategories({
      isActive,
      includeArchived: allowArchived,
      tree: tree === true
    });

    sendResponse(res, {
      message: 'Categories retrieved successfully.',
      data: { categories, count: categories.length }
    });
  },

  /**
   * Retrieve a single category by ID or slug.
   */
  async getCategory(req, res) {
    const { idOrSlug } = req.params;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role);

    const category = await categoryService.getCategoryByIdOrSlug(idOrSlug, {
      includeArchived: isAdmin
    });

    sendResponse(res, {
      message: 'Category retrieved successfully.',
      data: { category }
    });
  },

  /**
   * Create a new category (Admin).
   */
  async createCategory(req, res) {
    const category = await categoryService.createCategory(req.body);

    sendResponse(res, {
      statusCode: 201,
      message: 'Category created successfully.',
      data: { category }
    });
  },

  /**
   * Update category by ID (Admin).
   */
  async updateCategory(req, res) {
    const { idOrSlug } = req.params;
    const category = await categoryService.updateCategory(idOrSlug, req.body);

    sendResponse(res, {
      message: 'Category updated successfully.',
      data: { category }
    });
  },

  /**
   * Archive category (Admin).
   */
  async archiveCategory(req, res) {
    const { idOrSlug } = req.params;
    const category = await categoryService.archiveCategory(idOrSlug);

    sendResponse(res, {
      message: 'Category archived successfully.',
      data: { category }
    });
  },

  /**
   * Restore archived category (Admin).
   */
  async restoreCategory(req, res) {
    const { idOrSlug } = req.params;
    const category = await categoryService.restoreCategory(idOrSlug);

    sendResponse(res, {
      message: 'Category restored successfully.',
      data: { category }
    });
  },

  /**
   * Delete category with dependency protection (Admin).
   */
  async deleteCategory(req, res) {
    const { idOrSlug } = req.params;
    const result = await categoryService.deleteCategory(idOrSlug);

    sendResponse(res, {
      message: 'Category deleted successfully.',
      data: result
    });
  }
};
