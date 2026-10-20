import mongoose from 'mongoose';
import { Offer } from '../models/Offer.js';
import { NotFoundError, ConflictError, ValidationError } from '../utils/AppError.js';
import { slugify } from '../utils/slugHelper.js';

export const offerService = {
  /**
   * Create a new luxury promotional campaign or festival offer (Admin).
   */
  async createOffer(data) {
    const slug = data.slug ? slugify(data.slug) : slugify(data.title);
    if (!slug) {
      throw new ValidationError('A valid title or slug is required.');
    }

    const existing = await Offer.findOne({ slug });
    if (existing) {
      throw new ConflictError(`Offer with slug '${slug}' already exists.`);
    }

    const offer = await Offer.create({
      ...data,
      slug
    });

    return offer;
  },

  /**
   * List offers with pagination and filters (Admin).
   */
  async getOffers({ isActive, offerType, page = 1, limit = 20 } = {}) {
    const filter = {};
    if (typeof isActive === 'boolean') filter.isActive = isActive;
    if (offerType) filter.offerType = offerType;

    const skip = (page - 1) * limit;

    const [offers, total] = await Promise.all([
      Offer.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Offer.countDocuments(filter)
    ]);

    return {
      offers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Retrieve active promotional offers for public customer browsing.
   */
  async getActiveOffers() {
    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
      .sort({ priority: -1, endDate: 1 })
      .populate('applicableCategories', 'name slug')
      .populate('applicableCollections', 'name slug')
      .lean();

    return offers;
  },

  /**
   * Retrieve single offer by MongoDB ID or slug.
   */
  async getOfferByIdOrSlug(idOrSlug) {
    const isObjectId = mongoose.isValidObjectId(idOrSlug);
    const filter = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

    const offer = await Offer.findOne(filter)
      .populate('applicableCategories', 'name slug')
      .populate('applicableCollections', 'name slug')
      .populate('applicableProducts', 'title slug');

    if (!offer) {
      throw new NotFoundError(`Offer '${idOrSlug}' not found.`);
    }

    return offer;
  },

  /**
   * Update offer parameters (Admin).
   */
  async updateOffer(id, updateData) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid offer ID.');
    }

    const offer = await Offer.findById(id);
    if (!offer) {
      throw new NotFoundError('Offer not found.');
    }

    if (updateData.title || updateData.slug) {
      const newSlug = updateData.slug ? slugify(updateData.slug) : updateData.title ? slugify(updateData.title) : offer.slug;
      const existing = await Offer.findOne({ _id: { $ne: id }, slug: newSlug });
      if (existing) {
        throw new ConflictError(`Offer slug '${newSlug}' is already taken.`);
      }
      updateData.slug = newSlug;
    }

    Object.assign(offer, updateData);
    await offer.save();

    return offer;
  },

  /**
   * Delete offer (Admin).
   */
  async deleteOffer(id) {
    if (!mongoose.isValidObjectId(id)) {
      throw new ValidationError('Invalid offer ID.');
    }

    const offer = await Offer.findByIdAndDelete(id);
    if (!offer) {
      throw new NotFoundError('Offer not found.');
    }

    return { deletedId: id, title: offer.title };
  }
};
