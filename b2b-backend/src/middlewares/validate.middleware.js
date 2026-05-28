import { logger } from '../config/logger.js';

export const validate = (schema) => (req, res, next) => {
  // 🔥 Pre-processing: Convert common stringified values from FormData to proper types
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      // Convert 'true'/'false' strings to Booleans
      if (req.body[key] === 'true') req.body[key] = true;
      if (req.body[key] === 'false') req.body[key] = false;
      
      // Convert numeric strings to Numbers if they look like numbers and aren't IDs or Phone numbers
      const val = req.body[key];
      if (typeof val === 'string' && val.trim() !== '' && !isNaN(val)) {
        // Skip IDs (24-char hex strings or anything with 'id' in the key)
        // Also skip Phone/Mobile numbers which should stay as strings
        const isId = key.toLowerCase().includes('id') || (val.length === 24 && /^[0-9a-fA-F]+$/.test(val));
        const isPhone = key.toLowerCase().includes('mobile') || key.toLowerCase().includes('phone') || key.toLowerCase().includes('pincode');
        
        if (!isId && !isPhone) {
          req.body[key] = Number(val);
        }
      }
    });
  }

  const { error, value } = schema.validate(
    {
      body: req.body,
      query: req.query,
      params: req.params,
    },
    { abortEarly: false, allowUnknown: true, stripUnknown: false }
  );

  if (error) {
    const errorMessages = error.details.map((err) => err.message).join(', ');
    
    // Log validation errors without exposing sensitive data
    logger.warn({
      message: 'Validation failed',
      path: req.path,
      method: req.method,
      errors: error.details.map(d => ({ field: d.path.join('.'), type: d.type })),
    });

    return res.status(400).json({
      success: false,
      message: errorMessages,
      data: null,
    });
  }

  // 🔥 Update req.body with validated/transformed values
  // Note: req.query and req.params are read-only getters in Express and cannot be reassigned
  // The validation already processed them, so we only need to update req.body
  if (value.body) {
    req.body = value.body;
  }

  next();
};