/**
 * Utility functions for handling stock data in the frontend
 */

/**
 * Format price change for display
 * @param {number} currentPrice - Current price
 * @param {number} targetPrice - Target price
 * @returns {Object} Formatted price change data
 */
export const formatPriceChange = (currentPrice, targetPrice) => {
  if (!currentPrice || !targetPrice) {
    return { change: 'N/A', percentChange: 'N/A', isPositive: false };
  }
  
  const change = targetPrice - currentPrice;
  const percentChange = (change / currentPrice) * 100;
  const isPositive = change > 0;
  
  return {
    change: `₹${Math.abs(change).toFixed(2)}`,
    percentChange: `${Math.abs(percentChange).toFixed(2)}%`,
    isPositive
  };
};
