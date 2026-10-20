import mongoose from 'mongoose';
import { Collection } from '../models/Collection.js';
import { Product } from '../models/Product.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/AppError.js';
import { slugify } from '../utils/slugHelper.js';

export const collectionService = {
  /**
   * Create a new jewellery collection.
   */
  async createCollection(data) {
    const slug = data.slug ? slugify(data.slug) : slugify(data.name);

    if (!slug) {
      throw new ValidationError('A valid name or slug is required.');
    }

    const existing = await Collection.findOne({
      $or: [{ slug }, { name: { $regex: new RegExp(`^${data.name.trim()}$`, 'i') } }]
    });

    if (existing) {
      if (existing.slug === slug) {
        throw new ConflictError(`Collection with slug '${slug}' already exists.`);
      }
      throw new ConflictError(`Collection with name '${data.name}' already exists.`);
    }

    const collection = await Collection.create({
      ...data,
      slug
    });

    return collection;
  },

  /**
   * List collections with status, featured, and pagination support.
   */
  async getCollections({
    status,
    isFeatured,
    search,
    includeArchived = false,
    page = 1,
    limit = 20
  } = {}) {
    const filter = {};

    if (status) {
      filter.status = status;
    } else if (!includeArchived) {
      filter.status = { $ne: 'ARCHIVED' };
    }

    if (typeof isFeatured === 'boolean') {
      filter.isFeatured = isFeatured;
    }

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { slug: { $regex: escaped, $options: 'i' } },
        { tagline: { $regex: escaped, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [rawCollections, total] = await Promise.all([
      Collection.find(filter)
        .sort({ 'merchandisingMetadata.displayOrder': 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Collection.countDocuments(filter)
    ]);

    // Aggregate genuine productCount from Product.collectionIds
    let collections = rawCollections;
    if (rawCollections.length > 0) {
      const collectionIds = rawCollections.map((c) => c._id);
      const productCounts = await Product.aggregate([
        { $match: { collectionIds: { $in: collectionIds } } },
        { $unwind: '$collectionIds' },
        { $match: { collectionIds: { $in: collectionIds } } },
        { $group: { _id: '$collectionIds', count: { $sum: 1 } } }
      ]);

      const countMap = {};
      productCounts.forEach((pc) => {
        countMap[pc._id.toString()] = pc.count;
      });

      collections = rawCollections.map((c) => ({
        ...c,
        productCount: countMap[c._id.toString()] || 0
      }));
    }

    return {
      collections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Retrieve single collection by ID or slug.
   */
  async getCollectionByIdOrSlug(idOrSlug, { includeArchived = false } = {}) {
    const isObjectId = mongoose.isValidObjectId(idOrSlug);
    const filter = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

    if (!includeArchived) {
      filter.status = { $ne: 'ARCHIVED' };
    }

    const collection = await Collection.findOne(filter);
    if (!collection) {
      throw new NotFoundError(`Collection '${idOrSlug}' not found.`);
    }

    return collection;
  },

  /**
   * Update collection details.
   */
  async updateCollection(id, updateData) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid collection ID.');
    }

    const collection = await Collection.findById(id);
    if (!collection) {
      throw new NotFoundError('Collection not found.');
    }

    if (updateData.name || updateData.slug) {
      const newSlug = updateData.slug ? slugify(updateData.slug) : updateData.name ? slugify(updateData.name) : collection.slug;
      const collisionFilter = {
        _id: { $ne: id },
        $or: [{ slug: newSlug }]
      };

      if (updateData.name) {
        collisionFilter.$or.push({ name: { $regex: new RegExp(`^${updateData.name.trim()}$`, 'i') } });
      }

      const collision = await Collection.findOne(collisionFilter);
      if (collision) {
        if (collision.slug === newSlug) {
          throw new ConflictError(`Collection slug '${newSlug}' is already taken.`);
        }
        throw new ConflictError(`Collection name '${updateData.name}' is already taken.`);
      }

      if (updateData.slug || updateData.name) {
        updateData.slug = newSlug;
      }
    }

    Object.assign(collection, updateData);
    await collection.save();

    return collection;
  },

  /**
   * Change collection publication status.
   */
  async setStatus(id, status) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid collection ID.');
    }

    const collection = await Collection.findById(id);
    if (!collection) {
      throw new NotFoundError('Collection not found.');
    }

    collection.status = status;
    await collection.save();

    return collection;
  },

  /**
   * Delete collection and cleanly remove references from products.
   */
  async deleteCollection(id) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid collection ID.');
    }

    const collection = await Collection.findById(id);
    if (!collection) {
      throw new NotFoundError('Collection not found.');
    }

    // Detach collection from products
    await Product.updateMany({ collectionIds: id }, { $pull: { collectionIds: id } });

    await Collection.findByIdAndDelete(id);

    return { deletedId: id, name: collection.name };
  },

  /**
   * Associate products with this collection.
   */
  async addProductsToCollection(id, productIds) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid collection ID.');
    }

    const collection = await Collection.findById(id);
    if (!collection) {
      throw new NotFoundError('Collection not found.');
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $addToSet: { collectionIds: id } }
    );

    return {
      collectionId: id,
      modifiedCount: result.modifiedCount
    };
  },

  /**
   * Disassociate products from this collection.
   */
  async removeProductsFromCollection(id, productIds) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid collection ID.');
    }

    const collection = await Collection.findById(id);
    if (!collection) {
      throw new NotFoundError('Collection not found.');
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $pull: { collectionIds: id } }
    );

    return {
      collectionId: id,
      modifiedCount: result.modifiedCount
    };
  },

  /**
   * Get products belonging to a collection with catalog details.
   */
  async getCollectionProducts(idOrSlug, { page = 1, limit = 20, isCustomer = true } = {}) {
    const isObjectId = mongoose.isValidObjectId(idOrSlug);
    const filter = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

    const collection = await Collection.findOne(filter);
    if (!collection) {
      throw new NotFoundError(`Collection '${idOrSlug}' not found.`);
    }

    const productFilter = { collectionIds: collection._id };
    if (isCustomer) {
      productFilter.status = 'PUBLISHED';
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(productFilter)
        .populate('variants')
        .populate('categoryId', 'name slug')
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(productFilter)
    ]);

    return {
      collection,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
};
