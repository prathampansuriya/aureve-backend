import { StoreLocation } from '../models/StoreLocation.js';
import { Appointment } from '../models/Appointment.js';
import { NotFoundError, ConflictError } from '../utils/AppError.js';
import { slugify } from '../utils/slugHelper.js';

/**
 * Retrieves all active store locations for public display.
 */
export const getActiveStoreLocations = async ({ city, search } = {}) => {
  const query = { isActive: true };

  if (city) {
    query.city = { $regex: new RegExp(`^${city.trim()}$`, 'i') };
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { city: { $regex: escaped, $options: 'i' } },
      { state: { $regex: escaped, $options: 'i' } },
      { addressLine: { $regex: escaped, $options: 'i' } }
    ];
  }

  const stores = await StoreLocation.find(query).sort({ name: 1 }).lean();
  return stores;
};

/**
 * Retrieves a single store location by ID or slug.
 */
export const getStoreLocationByIdOrSlug = async (identifier) => {
  let store;
  if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
    store = await StoreLocation.findById(identifier).lean();
  }
  if (!store) {
    store = await StoreLocation.findOne({ slug: identifier.toLowerCase() }).lean();
  }

  if (!store) {
    throw new NotFoundError('Showroom location not found.');
  }

  return store;
};

/**
 * Retrieves all store locations for administrative management.
 */
export const getAllStoreLocationsAdmin = async ({ isActive, city, search, page = 1, limit = 50 } = {}) => {
  const query = {};

  if (typeof isActive === 'boolean') {
    query.isActive = isActive;
  }

  if (city) {
    query.city = { $regex: new RegExp(`^${city.trim()}$`, 'i') };
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { city: { $regex: escaped, $options: 'i' } },
      { slug: { $regex: escaped, $options: 'i' } }
    ];
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (numericPage - 1) * numericLimit;

  const [rawStores, total] = await Promise.all([
    StoreLocation.find(query).sort({ createdAt: -1 }).skip(skip).limit(numericLimit).lean(),
    StoreLocation.countDocuments(query)
  ]);

  let stores = rawStores;
  if (rawStores.length > 0) {
    const storeIds = rawStores.map((s) => s._id);
    const appointmentCounts = await Appointment.aggregate([
      { $match: { storeId: { $in: storeIds } } },
      { $group: { _id: '$storeId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    appointmentCounts.forEach((ac) => {
      countMap[ac._id.toString()] = ac.count;
    });

    stores = rawStores.map((s) => ({
      ...s,
      appointmentCount: countMap[s._id.toString()] || 0
    }));
  }

  return {
    stores,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit) || 1
    }
  };
};

/**
 * Creates a new store showroom location (Admin).
 */
export const createStoreLocation = async (data) => {
  const slug = data.slug ? slugify(data.slug) : slugify(data.name);

  const existing = await StoreLocation.findOne({
    $or: [{ name: data.name.trim() }, { slug }]
  });

  if (existing) {
    throw new ConflictError('A showroom with this name or slug already exists.');
  }

  const store = new StoreLocation({
    ...data,
    name: data.name.trim(),
    slug
  });

  await store.save();
  return store;
};

/**
 * Updates an existing store showroom location (Admin).
 */
export const updateStoreLocation = async (id, data) => {
  const store = await StoreLocation.findById(id);
  if (!store) {
    throw new NotFoundError('Showroom location not found.');
  }

  if (data.name && data.name.trim() !== store.name) {
    const existingName = await StoreLocation.findOne({
      _id: { $ne: id },
      name: data.name.trim()
    });
    if (existingName) {
      throw new ConflictError('Another showroom with this name already exists.');
    }
    store.name = data.name.trim();
  }

  if (data.slug && data.slug.toLowerCase() !== store.slug) {
    const cleanSlug = slugify(data.slug);
    const existingSlug = await StoreLocation.findOne({
      _id: { $ne: id },
      slug: cleanSlug
    });
    if (existingSlug) {
      throw new ConflictError('Another showroom with this slug already exists.');
    }
    store.slug = cleanSlug;
  }

  // Update attributes
  const updatableFields = [
    'addressLine',
    'city',
    'state',
    'postalCode',
    'phone',
    'email',
    'openingHours',
    'coordinates',
    'timezone',
    'appointmentConfig',
    'vipLoungeAvailable',
    'images',
    'isActive'
  ];

  for (const field of updatableFields) {
    if (data[field] !== undefined) {
      store[field] = data[field];
    }
  }

  await store.save();
  return store;
};

/**
 * Safely deletes a showroom location if no active or upcoming appointments exist (Admin).
 */
export const deleteStoreLocation = async (id) => {
  const store = await StoreLocation.findById(id);
  if (!store) {
    throw new NotFoundError('Showroom location not found.');
  }

  // Prevent deletion if active appointments exist
  const activeAppointments = await Appointment.countDocuments({
    storeLocationId: id,
    status: { $in: ['REQUESTED', 'CONFIRMED'] }
  });

  if (activeAppointments > 0) {
    throw new ConflictError(
      `Cannot delete showroom "${store.name}" with ${activeAppointments} active or upcoming customer appointments. Please deactivate the showroom instead.`
    );
  }

  await StoreLocation.findByIdAndDelete(id);
  return { message: `Showroom "${store.name}" deleted successfully.` };
};
