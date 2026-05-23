import mongoose from 'mongoose';

/**
 * Centralized error handler: maps known errors to HTTP responses.
 */
export function errorHandler(err, req, res, _next) {
  console.error(err);

  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Validation error', errors: messages });
  }

  if (err.code === 11000) {
    return res.status(400).json({ message: 'Duplicate field value' });
  }

  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return res.status(status).json({ message });
}
