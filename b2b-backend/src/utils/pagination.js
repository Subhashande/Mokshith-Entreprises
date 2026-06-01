import { logger } from '../config/logger.js';

/**
 * Pagination utility for consistent pagination across all endpoints
 */

// Default pagination settings
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

/**
 * Parse and validate pagination parameters
 */
export const parsePaginationParams = (query) => {
  const page = Math.max(parseInt(query.page, 10) || DEFAULT_PAGE, 1);
  let limit = parseInt(query.limit, 10) || DEFAULT_LIMIT;

  // Enforce limits
  limit = Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT);

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build pagination metadata
 */
export const buildPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};

/**
 * Paginate Mongoose query
 */
export const paginateQuery = async (query, options = {}) => {
  const { page, limit, skip } = parsePaginationParams(options);

  // Execute query with pagination
  const [data, total] = await Promise.all([
    query
      .skip(skip)
      .limit(limit)
      .lean()
      .maxTimeMS(5000), // 5 second timeout
    query.model.countDocuments(query.getFilter())
  ]);

  const meta = buildPaginationMeta(page, limit, total);

  return {
    data,
    pagination: meta
  };
};

/**
 * Pagination middleware - enforces pagination on all list endpoints
 */
export const paginationMiddleware = (req, res, next) => {
  const { page, limit, skip } = parsePaginationParams(req.query);

  // Attach to request
  req.pagination = { page, limit, skip };

  // Log excessive page requests (potential scraping)
  if (page > 1000) {
    logger.warn('Excessive pagination detected', {
      path: req.path,
      page,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  next();
};

/**
 * Format paginated response
 */
export const formatPaginatedResponse = (data, total, page, limit) => {
  const meta = buildPaginationMeta(page, limit, total);

  return {
    success: true,
    data,
    pagination: meta
  };
};

/**
 * Cursor-based pagination helper (for real-time feeds)
 */
export const parseCursorParams = (query) => {
  const limit = Math.min(parseInt(query.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const cursor = query.cursor || null;

  return { limit, cursor };
};

/**
 * Build cursor pagination response
 */
export const buildCursorResponse = (data, limit) => {
  const hasMore = data.length === limit;
  const nextCursor = hasMore && data.length > 0 
    ? data[data.length - 1]._id?.toString() || data[data.length - 1].id
    : null;

  return {
    success: true,
    data,
    pagination: {
      nextCursor,
      hasMore,
      limit
    }
  };
};
