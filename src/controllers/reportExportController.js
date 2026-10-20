import { reportExportService } from '../services/reportExportService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const reportExportController = {
  /**
   * Export orders report as sanitized CSV (Admin / Super Admin).
   */
  exportOrdersReport: asyncHandler(async (req, res) => {
    const { startDate, endDate, status, paymentStatus, limit } = req.query;

    const csvData = await reportExportService.exportOrdersCsv({
      startDate,
      endDate,
      status,
      paymentStatus,
      limit: limit ? Number(limit) : undefined
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aureve-orders-report-${timestamp}.csv"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    return res.status(200).send(csvData);
  }),

  /**
   * Export product variants inventory report as sanitized CSV (Admin / Super Admin).
   */
  exportInventoryReport: asyncHandler(async (req, res) => {
    const { stockStatus, categoryId, limit } = req.query;

    const csvData = await reportExportService.exportInventoryCsv({
      stockStatus,
      categoryId,
      limit: limit ? Number(limit) : undefined
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aureve-inventory-report-${timestamp}.csv"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    return res.status(200).send(csvData);
  }),

  /**
   * Export customer growth & accounts report as sanitized CSV (Admin / Super Admin).
   */
  exportCustomersReport: asyncHandler(async (req, res) => {
    const { status, role, startDate, endDate, limit } = req.query;

    const csvData = await reportExportService.exportCustomersCsv({
      status,
      role,
      startDate,
      endDate,
      limit: limit ? Number(limit) : undefined
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="aureve-customers-report-${timestamp}.csv"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    return res.status(200).send(csvData);
  })
};
