import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from './models.js';

const secret = process.env.JWT_SECRET || 'local-development-secret-change-me';

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function signUser(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role, email: user.email }, secret, { expiresIn: '7d' });
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    req.auth = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) return res.status(403).json({ message: 'You do not have authority for this task.' });
    next();
  };
}

export async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@civicconnect.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') { existing.role = 'admin'; await existing.save(); }
    return existing;
  }
  return User.create({ name: process.env.ADMIN_NAME || 'CivicConnect Administrator', email, passwordHash: await hashPassword(password), role: 'admin', department: 'Municipal Coordination', ward: 'All wards' });
}
