export const timeoutMiddleware = (req, res, next) => {
  res.setTimeout(5000, () => {
    res.status(408).json({
      success: false,
      message: 'Request timeout',
    });
  });
  next();
};