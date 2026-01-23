/**
 * Utility functions for generating Invoice Reference Numbers (IRN) for Leegality e-sign requests
 */

/**
 * Generate a random IRN (Invoice Reference Number) with the format INV-timestamp-randomNumber
 * @returns {string} - Random IRN
 */
export const generateRandomIRN = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${timestamp}-${random}`;
};

export default generateRandomIRN;
