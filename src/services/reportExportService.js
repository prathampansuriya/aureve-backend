import { Order } from '../models/Order.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { User } from '../models/User.js';

/**
 * Escapes a cell value for secure CSV formatting, preventing formula injection (CSV injection).
 * If a value begins with '=', '+', '-', '@', '\t', or '\r', prefixes with a single quote.
 */
export const sanitizeCsvCell = (val) => {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();

  // Defense against CSV injection (formula execution in Excel/Calc)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape double quotes by doubling them
  str = str.replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Converts an array of objects into a sanitized CSV string.
 */
export const buildCsvString = (headers, rows) => {
  const headerLine = headers.map((h) => sanitizeCsvCell(h.label)).join(',');
  const rowLines = rows.map((row) =>
    headers.map((h) => sanitizeCsvCell(h.getValue(row))).join(',')
  );
  return [headerLine, ...rowLines].join('\r\n');
};

/**
 * Generates bounded CSV export of customer orders.
 */
export const exportOrdersCsv = async ({ startDate, endDate, status } = {}) => {
  const query = {};

  if (status) {
    query.orderStatus = status.trim().toUpperCase();
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  // Bounded query limit: maximum 5,000 orders per export to safeguard server memory
  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .limit(5000)
    .populate('userId', 'firstName lastName email phone')
    .lean();

  const headers = [
    { label: 'Order Number', getValue: (o) => o.orderNumber },
    { label: 'Order Date (UTC)', getValue: (o) => new Date(o.createdAt).toISOString() },
    {
      label: 'Customer Name',
      getValue: (o) =>
        o.userId
          ? `${o.userId.firstName || ''} ${o.userId.lastName || ''}`.trim()
          : o.shippingAddress?.fullName || 'Guest'
    },
    { label: 'Customer Email', getValue: (o) => o.userId?.email || 'N/A' },
    { label: 'Customer Mobile', getValue: (o) => o.shippingAddress?.phone || o.userId?.phone || 'N/A' },
    { label: 'Order Status', getValue: (o) => o.orderStatus },
    { label: 'Payment Method', getValue: (o) => o.paymentMethod },
    { label: 'Payment Status', getValue: (o) => o.paymentStatus },
    { label: 'Subtotal (INR)', getValue: (o) => ((o.financialBreakdown?.subtotalPaise || 0) / 100).toFixed(2) },
    { label: 'GST (INR)', getValue: (o) => ((o.financialBreakdown?.gstPaise || 0) / 100).toFixed(2) },
    { label: 'Discount (INR)', getValue: (o) => ((o.financialBreakdown?.discountPaise || 0) / 100).toFixed(2) },
    { label: 'Grand Total (INR)', getValue: (o) => ((o.financialBreakdown?.grandTotalPaise || 0) / 100).toFixed(2) },
    { label: 'Items Count', getValue: (o) => (o.items || []).length },
    { label: 'Destination City', getValue: (o) => o.shippingAddress?.city || '' },
    { label: 'Destination State', getValue: (o) => o.shippingAddress?.state || '' }
  ];

  return buildCsvString(headers, orders);
};

/**
 * Generates bounded CSV export of catalog inventory and stock valuation.
 */
export const exportInventoryCsv = async () => {
  const variants = await ProductVariant.find({ isActive: true })
    .populate('productId', 'title slug sku')
    .sort({ inventoryCount: 1 })
    .limit(5000)
    .lean();

  const headers = [
    { label: 'Product Title', getValue: (v) => v.productId?.title || 'Unknown Piece' },
    { label: 'Product SKU', getValue: (v) => v.productId?.sku || '' },
    { label: 'Variant SKU', getValue: (v) => v.sku },
    { label: 'Variant Name', getValue: (v) => v.variantName || '' },
    { label: 'Metal Type', getValue: (v) => v.metalType || '' },
    { label: 'Metal Purity', getValue: (v) => v.metalPurity || '' },
    { label: 'Size', getValue: (v) => v.size || '' },
    { label: 'Price (INR)', getValue: (v) => ((v.priceInPaise || 0) / 100).toFixed(2) },
    { label: 'Inventory Count', getValue: (v) => v.inventoryCount },
    {
      label: 'Inventory Valuation (INR)',
      getValue: (v) => (((v.priceInPaise || 0) * (v.inventoryCount || 0)) / 100).toFixed(2)
    },
    { label: 'Stock Status', getValue: (v) => (v.inventoryCount === 0 ? 'OUT_OF_STOCK' : v.inventoryCount <= 5 ? 'LOW_STOCK' : 'HEALTHY') }
  ];

  return buildCsvString(headers, variants);
};

/**
 * Generates bounded CSV export of registered patrons.
 */
export const exportCustomersCsv = async () => {
  const customers = await User.find({ role: 'CUSTOMER' })
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean();

  const headers = [
    { label: 'Customer ID', getValue: (c) => c._id.toString() },
    { label: 'First Name', getValue: (c) => c.firstName },
    { label: 'Last Name', getValue: (c) => c.lastName },
    { label: 'Email', getValue: (c) => c.email },
    { label: 'Mobile', getValue: (c) => c.phone || 'N/A' },
    { label: 'Status', getValue: (c) => c.status },
    { label: 'Verified', getValue: (c) => (c.isVerified ? 'YES' : 'NO') },
    { label: 'Registration Date (UTC)', getValue: (c) => new Date(c.createdAt).toISOString() }
  ];

  return buildCsvString(headers, customers);
};

export const reportExportService = {
  sanitizeCsvCell,
  buildCsvString,
  exportOrdersCsv,
  exportInventoryCsv,
  exportCustomersCsv
};

