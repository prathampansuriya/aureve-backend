import { ContactInquiry } from '../models/ContactInquiry.js';
import { NotFoundError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export const createContactInquiry = async (data) => {
  const inquiry = await ContactInquiry.create(data);
  logger.info(`[ContactInquiry] New patron inquiry logged: ${inquiry.inquiryNumber} by ${inquiry.email}`);
  return inquiry;
};

export const listContactInquiries = async ({ page = 1, limit = 20, status = 'ALL', search = '' }) => {
  const query = {};

  if (status && status !== 'ALL') {
    query.status = status;
  }

  if (search && search.trim()) {
    const term = search.trim();
    query.$or = [
      { inquiryNumber: { $regex: term, $options: 'i' } },
      { fullName: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
      { phone: { $regex: term, $options: 'i' } },
      { subject: { $regex: term, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;

  const [inquiries, total] = await Promise.all([
    ContactInquiry.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ContactInquiry.countDocuments(query)
  ]);

  return {
    inquiries,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

export const getContactInquiryById = async (id) => {
  const inquiry = await ContactInquiry.findById(id).lean();
  if (!inquiry) {
    throw new NotFoundError(`Contact inquiry not found with id: ${id}`);
  }
  return inquiry;
};

export const updateContactInquiry = async (id, updateData, user) => {
  const inquiry = await ContactInquiry.findById(id);
  if (!inquiry) {
    throw new NotFoundError(`Contact inquiry not found with id: ${id}`);
  }

  if (updateData.status) {
    inquiry.status = updateData.status;
    if (updateData.status === 'RESOLVED' || updateData.status === 'CONTACTED') {
      inquiry.respondedAt = new Date();
      inquiry.respondedBy = user?._id || null;
    }
  }

  if (updateData.adminNotes !== undefined) {
    inquiry.adminNotes = updateData.adminNotes;
  }

  await inquiry.save();
  return inquiry;
};

export const deleteContactInquiry = async (id) => {
  const inquiry = await ContactInquiry.findByIdAndDelete(id);
  if (!inquiry) {
    throw new NotFoundError(`Contact inquiry not found with id: ${id}`);
  }
  return inquiry;
};
