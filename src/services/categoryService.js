import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/AppError.js';
import { slugify } from '../utils/slugHelper.js';

export const categoryService = {
  /**
   * Create a new jewellery category with unique name & slug validation.
   */
  async createCategory(data) {
    const slug = data.slug ? slugify(data.slug) : slugify(data.name);

    if (!slug) {
      throw new ValidationError('A valid name or slug is required to generate a URL identifier.');
    }

    const existing = await Category.findOne({
      $or: [{ slug }, { name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') } }]
    });

    if (existing) {
      if (existing.slug === slug) {
        throw new ConflictError(`Category with slug '${slug}' already exists.`);
      }
      throw new ConflictError(`Category with name '${data.name}' already exists.`);
    }

    if (data.parentCategory) {
      if (!mongoose.isValidObjectId(data.parentCategory)) {
        throw new ValidationError('Invalid parent category ID.');
      }
      const parent = await Category.findById(data.parentCategory);
      if (!parent) {
        throw new NotFoundError('Parent category not found.');
      }
      if (parent.isArchived) {
        throw new ValidationError('Cannot assign an archived category as parent.');
      }
    }

    // Require image when creating an active category
    if (data.isActive !== false && (!data.image || !data.image.url)) {
      throw new ValidationError('A category primary image is required for published/active categories.');
    }

    const category = await Category.create({
      ...data,
      slug
    });

    return category;
  },

  /**
   * Get categories with optional tree hierarchy, archival filtering, and sorting.
   */
  async getCategories({ isActive, includeArchived = false, tree = false } = {}) {
    const filter = {};

    if (!includeArchived) {
      filter.isArchived = false;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const categories = await Category.find(filter)
      .sort({ displayOrder: 1, name: 1 })
      .populate('parentCategory', 'name slug')
      .lean();

    // Aggregate real product counts for each category
    const categoryIds = categories.map((c) => c._id);
    const productCounts = await Product.aggregate([
      { $match: { categoryId: { $in: categoryIds } } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } }
    ]);
    const countMap = new Map();
    productCounts.forEach((pc) => {
      countMap.set(pc._id.toString(), pc.count);
    });

    const enrichedCategories = categories.map((cat) => ({
      ...cat,
      productCount: countMap.get(cat._id.toString()) || 0
    }));

    if (!tree) {
      return enrichedCategories;
    }

    // Build hierarchy tree
    const categoryMap = new Map();
    const rootCategories = [];

    enrichedCategories.forEach((cat) => {
      categoryMap.set(cat._id.toString(), { ...cat, children: [] });
    });

    enrichedCategories.forEach((cat) => {
      const parentId = cat.parentCategory?._id?.toString() || cat.parentCategory?.toString();
      if (parentId && categoryMap.has(parentId)) {
        categoryMap.get(parentId).children.push(categoryMap.get(cat._id.toString()));
      } else {
        rootCategories.push(categoryMap.get(cat._id.toString()));
      }
    });

    return rootCategories;
  },

  /**
   * Retrieve single category by MongoDB ID or slug.
   */
  async getCategoryByIdOrSlug(idOrSlug, { includeArchived = false } = {}) {
    const isObjectId = mongoose.isValidObjectId(idOrSlug);
    const filter = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

    if (!includeArchived) {
      filter.isArchived = false;
    }

    const category = await Category.findOne(filter).populate('parentCategory', 'name slug');

    if (!category) {
      throw new NotFoundError(`Category '${idOrSlug}' not found.`);
    }

    return category;
  },

  /**
   * Update category fields with slug & dependency validation.
   */
  async updateCategory(id, updateData) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid category ID.');
    }

    const category = await Category.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found.');
    }

    if (updateData.name || updateData.slug) {
      const newSlug = updateData.slug ? slugify(updateData.slug) : updateData.name ? slugify(updateData.name) : category.slug;
      const collisionFilter = {
        _id: { $ne: id },
        $or: [{ slug: newSlug }]
      };

      if (updateData.name) {
        collisionFilter.$or.push({ name: { $regex: new RegExp(`^${updateData.name.trim()}$`, 'i') } });
      }

      const collision = await Category.findOne(collisionFilter);
      if (collision) {
        if (collision.slug === newSlug) {
          throw new ConflictError(`Category slug '${newSlug}' is already taken.`);
        }
        throw new ConflictError(`Category name '${updateData.name}' is already taken.`);
      }

      if (updateData.slug || updateData.name) {
        updateData.slug = newSlug;
      }
    }

    if (updateData.parentCategory !== undefined) {
      if (updateData.parentCategory) {
        if (updateData.parentCategory.toString() === id.toString()) {
          throw new ValidationError('A category cannot be its own parent.');
        }
        const parent = await Category.findById(updateData.parentCategory);
        if (!parent) {
          throw new NotFoundError('Parent category not found.');
        }
      }
    }

    // Require image if active
    const willBeActive = updateData.isActive !== undefined ? updateData.isActive : category.isActive;
    const finalImage = updateData.image || category.image;
    if (willBeActive && (!finalImage || !finalImage.url)) {
      throw new ValidationError('A published or active category must have a valid primary image.');
    }

    Object.assign(category, updateData);
    await category.save();

    return category;
  },

  /**
   * Archive category (soft-deletion/hiding from public catalog).
   */
  async archiveCategory(id) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid category ID.');
    }

    const category = await Category.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found.');
    }

    category.isArchived = true;
    category.isActive = false;
    await category.save();

    return category;
  },

  /**
   * Restore archived category.
   */
  async restoreCategory(id) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid category ID.');
    }

    const category = await Category.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found.');
    }

    category.isArchived = false;
    category.isActive = true;
    await category.save();

    return category;
  },

  /**
   * Unsafe deletion safeguard: prevent deletion if dependent products or child categories exist.
   */
  async deleteCategory(id) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid category ID.');
    }

    const category = await Category.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found.');
    }

    // Check for dependent products
    const productCount = await Product.countDocuments({ categoryId: id });
    if (productCount > 0) {
      throw new ConflictError(
        `Cannot delete category '${category.name}' because ${productCount} product(s) are associated with it. Please reassign or archive instead.`
      );
    }

    // Check for child categories
    const childCount = await Category.countDocuments({ parentCategory: id, isArchived: false });
    if (childCount > 0) {
      throw new ConflictError(
        `Cannot delete category '${category.name}' because ${childCount} child category/categories depend on it.`
      );
    }

    await Category.findByIdAndDelete(id);

    return { deletedId: id, name: category.name };
  }
};
