import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * Service for fetching Last Traded Price (LTP) from FastAPI backend
 * Base URL: https://mstock-ltp.onrender.com/
 */
class LTPService {
  constructor() {
    this.baseURL = process.env.LTP_API_URL || 'https://mstock-ltp.onrender.com';
    this.timeout = 10000; // 10 seconds timeout
  }

  /**
   * Fetch single stock price
   * @param {string} exchange - NSE or BSE
   * @param {string} symbol - Stock symbol (e.g., TCS, RELIANCE)
   * @returns {Promise<Object>} { exchange, symbol, ltp }
   */
  async fetchSinglePrice(exchange, symbol) {
    try {
      console.log('\n=== LTP SERVICE: FETCH SINGLE PRICE ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Request:', { exchange, symbol });
      console.log('Base URL:', this.baseURL);
      console.log('Endpoint:', `${this.baseURL}/ltp`);
      console.log('Params:', { exchange, symbol });
      logger.info(`Fetching LTP for ${exchange}:${symbol}`);
      
      const response = await axios.get(`${this.baseURL}/ltp`, {
        params: { exchange, symbol },
        timeout: this.timeout
      });

      console.log('✅ Response Status:', response.status);
      console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));
      console.log('✅ Response Headers:', JSON.stringify(response.headers, null, 2));
      logger.info(`LTP fetched successfully: ${exchange}:${symbol} = ${response.data.ltp}`);
      console.log('=== END FETCH SINGLE PRICE ===\n');
      return response.data;
    } catch (error) {
      console.log('❌ ERROR IN FETCH SINGLE PRICE');
      console.log('Error Type:', error.constructor.name);
      console.log('Error Message:', error.message);
      console.log('Error Code:', error.code);
      console.log('Error Response:', error.response ? JSON.stringify(error.response.data, null, 2) : 'No response');
      console.log('Error Status:', error.response?.status);
      console.log('Error Headers:', error.response ? JSON.stringify(error.response.headers, null, 2) : 'No headers');
      console.log('=== END FETCH SINGLE PRICE (ERROR) ===\n');
      logger.error(`Error fetching single LTP for ${exchange}:${symbol}: ${error.message}`);
      throw new Error(`Failed to fetch price for ${symbol}: ${error.message}`);
    }
  }

  /**
   * Fetch multiple stocks from the same exchange (RECOMMENDED for efficiency)
   * @param {string} exchange - NSE or BSE
   * @param {Array<string>} symbols - Array of stock symbols
   * @returns {Promise<Object>} { exchange, prices: { SYMBOL: price, ... } }
   */
  async fetchBatchPrices(exchange, symbols) {
    try {
      if (!symbols || symbols.length === 0) {
        throw new Error('Symbols array cannot be empty');
      }

      console.log('\n=== LTP SERVICE: FETCH BATCH PRICES ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Request:', { exchange, symbols });
      console.log('Base URL:', this.baseURL);
      console.log('Endpoint:', `${this.baseURL}/ltp/batch`);
      console.log('Symbols Count:', symbols.length);
      console.log('Symbols:', symbols);
      
      const symbolsParam = symbols.join(',');
      console.log('Symbols Param:', symbolsParam);
      
      logger.info(`Fetching batch LTP for ${symbols.length} symbols from ${exchange}`);
      
      const response = await axios.get(`${this.baseURL}/ltp/batch`, {
        params: { exchange, symbols: symbolsParam },
        timeout: this.timeout
      });

      console.log('✅ Response Status:', response.status);
      console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));
      console.log('✅ Response Headers:', JSON.stringify(response.headers, null, 2));
      logger.info(`Batch LTP fetched successfully: ${symbols.length} symbols from ${exchange}`);
      console.log('=== END FETCH BATCH PRICES ===\n');
      return response.data;
    } catch (error) {
      console.log('❌ ERROR IN FETCH BATCH PRICES');
      console.log('Error Type:', error.constructor.name);
      console.log('Error Message:', error.message);
      console.log('Error Code:', error.code);
      console.log('Error Response:', error.response ? JSON.stringify(error.response.data, null, 2) : 'No response');
      console.log('Error Status:', error.response?.status);
      console.log('Error Headers:', error.response ? JSON.stringify(error.response.headers, null, 2) : 'No headers');
      console.log('=== END FETCH BATCH PRICES (ERROR) ===\n');
      logger.error(`Error fetching batch LTP: ${error.message}`);
      throw new Error(`Failed to fetch batch prices: ${error.message}`);
    }
  }

  /**
   * Fetch multiple stocks across different exchanges
   * @param {Array<Object>} items - Array of { exchange, symbol } objects
   * @returns {Promise<Object>} { prices: { "EXCHANGE:SYMBOL": price, ... } }
   */
  async fetchMultiExchangePrices(items) {
    try {
      if (!items || items.length === 0) {
        throw new Error('Items array cannot be empty');
      }

      logger.info(`Fetching multi-exchange LTP for ${items.length} items`);
      
      // Format: NSE:TCS,BSE:TCS,NSE:RELIANCE
      const itemsParam = items.map(item => `${item.exchange}:${item.symbol}`).join(',');
      
      const response = await axios.get(`${this.baseURL}/ltp/multi`, {
        params: { items: itemsParam },
        timeout: this.timeout
      });

      logger.info(`Multi-exchange LTP fetched successfully: ${items.length} items`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching multi-exchange LTP: ${error.message}`);
      throw new Error(`Failed to fetch multi-exchange prices: ${error.message}`);
    }
  }

  /**
   * Helper: Group symbols by exchange for optimal batch fetching
   * @param {Array<Object>} items - Array of { exchange, symbol } objects
   * @returns {Object} { NSE: [symbols], BSE: [symbols] }
   */
  groupByExchange(items) {
    const grouped = {};
    
    for (const item of items) {
      if (!grouped[item.exchange]) {
        grouped[item.exchange] = [];
      }
      grouped[item.exchange].push(item.symbol);
    }
    
    return grouped;
  }

  /**
   * Smart fetch: Automatically chooses the best endpoint based on input
   * @param {Array<Object>} items - Array of { exchange, symbol } objects
   * @returns {Promise<Object>} Normalized prices object
   */
  async smartFetch(items) {
    try {
      if (!items || items.length === 0) {
        throw new Error('Items array cannot be empty');
      }

      // Single item - use single endpoint
      if (items.length === 1) {
        const { exchange, symbol } = items[0];
        const result = await this.fetchSinglePrice(exchange, symbol);
        return {
          [`${exchange}:${symbol}`]: result.ltp
        };
      }

      // Group by exchange
      const grouped = this.groupByExchange(items);
      const exchanges = Object.keys(grouped);

      // Single exchange - use batch endpoint (most efficient)
      if (exchanges.length === 1) {
        const exchange = exchanges[0];
        const symbols = grouped[exchange];
        const result = await this.fetchBatchPrices(exchange, symbols);
        
        // Normalize to EXCHANGE:SYMBOL format
        const normalized = {};
        for (const [symbol, price] of Object.entries(result.prices)) {
          normalized[`${exchange}:${symbol}`] = price;
        }
        return normalized;
      }

      // Multiple exchanges - use multi endpoint
      const result = await this.fetchMultiExchangePrices(items);
      return result.prices;

    } catch (error) {
      logger.error(`Error in smart fetch: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch prices for stock recommendations
   * Optimized for the recommendation management use case
   * @param {Array<Object>} recommendations - Array with stockSymbol and optional exchange
   * @returns {Promise<Object>} { symbol: price, ... }
   */
  async fetchRecommendationPrices(recommendations) {
    try {
      // Build items array with exchange info
      const items = recommendations.map(rec => ({
        exchange: rec.exchange || 'NSE', // Default to NSE if not specified
        symbol: rec.stockSymbol
      }));

      const prices = await this.smartFetch(items);
      
      // Convert back to simple symbol: price format for compatibility
      const simplePrices = {};
      for (const [key, price] of Object.entries(prices)) {
        const symbol = key.split(':')[1]; // Extract symbol from "NSE:TCS"
        simplePrices[symbol] = price;
      }

      return simplePrices;
    } catch (error) {
      logger.error(`Error fetching recommendation prices: ${error.message}`);
      throw error;
    }
  }
}

// Export singleton instance
export default new LTPService();
