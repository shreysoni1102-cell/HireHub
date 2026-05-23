import jwt from 'jsonwebtoken';

/**
 * Creates a signed JWT with user id and role in the payload.
 */
export function generateToken(userId, role) {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}
