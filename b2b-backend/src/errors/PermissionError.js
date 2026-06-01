class PermissionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PermissionError';
    this.statusCode = 403;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default PermissionError;