/**
 * Shared input validation utilities
 */

// ─── Email ───
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (email) => EMAIL_REGEX.test(String(email).trim());

// ─── Phone (Indian) ───
const PHONE_REGEX = /^[6-9]\d{9}$/;
export const isValidPhone = (phone) => PHONE_REGEX.test(String(phone).replace(/\D/g, ''));
export const sanitizePhone = (phone) => String(phone).replace(/\D/g, '').slice(0, 10);

// ─── PAN ───
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const isValidPAN = (pan) => PAN_REGEX.test(String(pan).toUpperCase().trim());
export const formatPAN = (pan) => String(pan).toUpperCase().trim();

// ─── Date of Birth ───
export const isValidDOB = (dob) => {
  if (!dob) return false;
  const date = new Date(dob);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  const age = now.getFullYear() - date.getFullYear();
  return age >= 18 && age <= 120;
};

// ─── Generic text ───
export const isNotEmpty = (val) => typeof val === 'string' && val.trim().length > 0;
export const isMinLength = (val, min) => typeof val === 'string' && val.trim().length >= min;
export const isMaxLength = (val, max) => typeof val === 'string' && val.trim().length <= max;

// ─── File validation ───
export const isValidFileSize = (file, maxMB = 5) => file && file.size <= maxMB * 1024 * 1024;
export const isValidImageType = (file) => {
  if (!file) return false;
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return allowed.includes(file.type);
};

// ─── Transaction ID ───
export const isValidTransactionId = (id) => {
  if (!id) return false;
  const trimmed = String(id).trim();
  return trimmed.length >= 6 && trimmed.length <= 50;
};

// ─── Name ───
export const isValidName = (name) => {
  if (!name) return false;
  const trimmed = String(name).trim();
  return trimmed.length >= 2 && trimmed.length <= 100 && /^[a-zA-Z\s.'-]+$/.test(trimmed);
};

// ─── Sanitize generic input (strip leading/trailing whitespace, collapse internal spaces) ───
export const sanitizeInput = (val) => String(val || '').trim().replace(/\s+/g, ' ');
