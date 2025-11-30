/**
 * Utility functions for handling stock data
 */

/**
 * Process stock data from Zerodha API response
 * @param {Object} stockData - Stock data from Zerodha API
 * @returns {Object} Processed stock data
 */
const processStockData = (stockData) => {
  if (!stockData) {
    return null;
  }

  return {
    symbol: stockData.tradingsymbol,
    name: stockData.name,
    exchange: stockData.exchange,
    instrumentToken: stockData.instrument_token,
    exchangeToken: stockData.exchange_token,
    lastPrice: stockData.last_price || 0,
    tickSize: stockData.tick_size,
    lotSize: stockData.lot_size,
    instrumentType: stockData.instrument_type,
    segment: stockData.segment
  };
};

/**
 * Format stock data for recommendation form
 * @param {Object} stockData - Processed stock data
 * @returns {Object} Formatted stock data for recommendation form
 */
const formatStockForRecommendation = (stockData) => {
  if (!stockData) {
    return null;
  }

  return {
    stockSymbol: stockData.symbol,
    stockName: stockData.name,
    currentPrice: stockData.lastPrice,
    exchange: stockData.exchange,
    instrumentToken: stockData.instrumentToken
  };
};

module.exports = {
  processStockData,
  formatStockForRecommendation
};
