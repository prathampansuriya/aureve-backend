import * as auditService from '../services/auditService.js';
import { sendResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listAuditLogs = asyncHandler(async (req, res) => {
  const result = await auditService.getAuditLogs(req.query);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Audit logs retrieved successfully.',
    data: result
  });
});

export const auditLogController = {
  listAuditLogs
};

