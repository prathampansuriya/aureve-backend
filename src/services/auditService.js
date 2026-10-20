import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

/**
 * Creates an immutable audit log record for security, administrative, or catalog modifications.
 */
export const recordAuditLog = async ({
  action,
  entity,
  entityId,
  performedBy,
  ipAddress = '127.0.0.1',
  userAgent = '',
  changes = null,
  metadata = {}
}) => {
  try {
    const log = new AuditLog({
      action,
      entity,
      entityId,
      performedBy,
      ipAddress,
      userAgent,
      changes,
      metadata
    });
    await log.save();
    return log;
  } catch (error) {
    logger.error(`[AUDIT LOG FAILURE] Failed to write audit log for action ${action} on ${entity}: ${error.message}`);
    // Non-blocking for primary operational flow, but logged to Winston
    return null;
  }
};

/**
 * Retrieves paginated audit logs with search and date range filters (Super Admin only).
 */
export const getAuditLogs = async ({
  action,
  entity,
  entityId,
  performedBy,
  startDate,
  endDate,
  page = 1,
  limit = 50
} = {}) => {
  const query = {};

  if (action) {
    query.action = action.trim().toUpperCase();
  }

  if (entity) {
    query.entity = entity.trim();
  }

  if (entityId) {
    query.entityId = entityId;
  }

  if (performedBy) {
    query.performedBy = performedBy;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (numericPage - 1) * numericLimit;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('performedBy', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    AuditLog.countDocuments(query)
  ]);

  return {
    logs,
    auditLogs: logs,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit) || 1
    }
  };
};
