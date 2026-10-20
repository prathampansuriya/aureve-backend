/**
 * Standard API Response envelope helper matching docs/api-contract.md
 */
export const sendResponse = (
  res,
  {
    statusCode = 200,
    message = 'Operation completed successfully.',
    data = {},
    meta = {}
  } = {}
) => {
  const requestId = res.req?.id || res.getHeader('X-Request-Id') || 'unknown';

  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      ...meta
    }
  });
};
