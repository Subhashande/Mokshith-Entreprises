/**
 * Validates and sanitizes pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {number} maxLimit - Maximum allowed limit (default: 100)
 * @returns {Object} Validated pagination parameters
 */
export const validatePagination = (page = 1, limit = 10, maxLimit = 100) => {
  const validPage = Math.max(1, Math.min(parseInt(page) || 1, 1000));
  const validLimit = Math.max(1, Math.min(parseInt(limit) || 10, maxLimit));
  const skip = (validPage - 1) * validLimit;

  return {
    page: validPage,
    limit: validLimit,
    skip
  };
};

/**
 * Creates a paginated response object
 * @param {Array} data - Array of items
 * @param {number} total - Total count of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Paginated response
 */
export const createPaginatedResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};
