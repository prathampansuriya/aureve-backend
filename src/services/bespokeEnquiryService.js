import { BespokeEnquiry } from '../models/BespokeEnquiry.js';
import { AuditLog } from '../models/AuditLog.js';
import { NotFoundError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

const generateInquiryCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AV-BESPOKE-${random}`;
};

/**
 * Creates a new customer bespoke commission enquiry.
 */
export const createEnquiry = async (enquiryData) => {
  const inquiryCode = generateInquiryCode();

  const enquiry = await BespokeEnquiry.create({
    ...enquiryData,
    inquiryCode,
    status: 'NEW'
  });

  logger.info(`[BESPOKE ENQUIRY] New commission inquiry recorded: ${inquiryCode} for ${enquiry.clientEmail}`);

  return enquiry;
};

/**
 * Lists paginated bespoke enquiries for administrative review.
 */
export const listEnquiries = async ({ page = 1, limit = 20, status = 'ALL', search = '' }) => {
  const query = {};

  if (status && status !== 'ALL') {
    query.status = status;
  }

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { inquiryCode: { $regex: s, $options: 'i' } },
      { clientName: { $regex: s, $options: 'i' } },
      { clientEmail: { $regex: s, $options: 'i' } },
      { clientPhone: { $regex: s, $options: 'i' } },
      { pieceType: { $regex: s, $options: 'i' } }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [enquiries, total] = await Promise.all([
    BespokeEnquiry.find(query)
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    BespokeEnquiry.countDocuments(query)
  ]);

  return {
    enquiries,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1
    }
  };
};

/**
 * Retrieves single bespoke enquiry details by ID.
 */
export const getEnquiryById = async (id) => {
  const enquiry = await BespokeEnquiry.findById(id)
    .populate('assignedTo', 'firstName lastName email')
    .lean();

  if (!enquiry) {
    throw new NotFoundError('Bespoke commission inquiry not found.');
  }

  return enquiry;
};

/**
 * Updates status, notes, or staff assignment for an enquiry.
 */
export const updateEnquiry = async (id, updateData, user) => {
  const enquiry = await BespokeEnquiry.findById(id);

  if (!enquiry) {
    throw new NotFoundError('Bespoke commission inquiry not found.');
  }

  const beforeStatus = enquiry.status;

  if (updateData.status) enquiry.status = updateData.status;
  if (updateData.adminNotes !== undefined) enquiry.adminNotes = updateData.adminNotes;
  if (updateData.assignedTo !== undefined) enquiry.assignedTo = updateData.assignedTo;

  await enquiry.save();

  await AuditLog.create({
    action: 'BESPOKE_ENQUIRY_UPDATED',
    entity: 'BespokeEnquiry',
    entityId: enquiry._id,
    performedBy: user?._id || null,
    ipAddress: '127.0.0.1',
    changes: {
      inquiryCode: enquiry.inquiryCode,
      beforeStatus,
      afterStatus: enquiry.status
    }
  }).catch((err) => logger.warn('[AuditLog] Failed to log BespokeEnquiry update:', err.message));

  return enquiry;
};
