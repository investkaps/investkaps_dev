import axios from 'axios';
import MStockToken from '../model/MStockToken.js';
import logger from '../utils/logger.js';

/**
 * m.Stock Type-B Trading API Service
 * 
 * RESPONSIBILITIES:
 * - Fetch active access token from database
 * - Fetch API key from environment variables
 * - Call m.Stock Type-B API for live prices
 * - NO token generation, OTP, or login logic
 */
class MStockTypeBService {
  constructor() {
    this.baseURL = 'https://api.mstock.trade/openapi/typeb';
    this.apiKey = null; // Lazy-loaded
  }

  /**
   * Get API key from environment (lazy initialization)
   * @returns {string} API key
   * @private
   */
  _getApiKey() {
    if (!this.apiKey) {
      this.apiKey = process.env.MSTOCK_API_KEY;
      if (!this.apiKey) {
        throw new Error('MSTOCK_API_KEY not configured in environment variables');
      }
    }
    return this.apiKey;
  }

  /**
   * Fetch the active access token from database
   * @returns {Promise<string>} Active access token
   * @private
   */
  async _getActiveToken() {
    try {
      const tokenDoc = await MStockToken.findOne({
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      if (!tokenDoc) {
        throw new Error('No active m.Stock token found in database');
      }

      logger.info('Active m.Stock token retrieved from database');
      return tokenDoc.accessToken;
    } catch (error) {
      logger.error('Error fetching active m.Stock token:', error.message);
      throw error;
    }
  }

  /**
   * Fetch live prices from m.Stock Type-B API
   * @param {Array<string>} symbols - Array of stock symbols (e.g., ["RELIANCE", "TCS"])
   * @returns {Promise<Object>} Price data from m.Stock
   */
  async fetchLivePrices(symbols) {
    try {
      console.log('\n=== M.STOCK SERVICE: FETCH LIVE PRICES ===');
      console.log('Received symbols:', symbols);

      // Validate input
      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        throw new Error('Symbols array is required and must not be empty');
      }

      // Get active token from database
      console.log('\n[1/4] Fetching active token from database...');
      const accessToken = await this._getActiveToken();
      console.log('✅ Token retrieved (masked):', accessToken.substring(0, 10) + '...' + accessToken.substring(accessToken.length - 5));
      
      // Get API key from environment
      console.log('\n[2/4] Getting API key from environment...');
      const apiKey = this._getApiKey();
      console.log('✅ API key retrieved (masked):', apiKey.substring(0, 10) + '...');

      // Prepare request
      // Note: m.Stock Type-B requires exchange prefix (NSE/BSE)
      // If symbols don't have exchange, default to NSE
      const formattedSymbols = symbols.map(symbol => {
        if (symbol.includes(':')) {
          return symbol; // Already has exchange
        }
        return `NSE:${symbol}`; // Default to NSE
      });
      
      // Try the correct m.Stock Type-B endpoint
      // Common variations: /ltp, /quotes/ltp, /market/ltp, /quote/ltp
      const endpoint = `${this.baseURL}/ltp`;
      const requestPayload = { symbols: formattedSymbols };
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'X-PrivateKey': apiKey,
        'X-Mirae-Version': '1',
        'Content-Type': 'application/json'
      };

      console.log('\n[3/4] Calling m.Stock API...');
      console.log('Endpoint:', endpoint);
      console.log('Request payload:', JSON.stringify(requestPayload, null, 2));
      console.log('Request headers:', JSON.stringify({
        'Authorization': 'Bearer ' + accessToken.substring(0, 10) + '...',
        'X-PrivateKey': apiKey.substring(0, 10) + '...',
        'X-Mirae-Version': '1',
        'Content-Type': 'application/json'
      }, null, 2));

      // Call m.Stock API
      const response = await axios.post(endpoint, requestPayload, { headers });

      console.log('\n[4/4] m.Stock API response received');
      console.log('Response status:', response.status);
      console.log('Response headers:', JSON.stringify(response.headers, null, 2));
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      console.log('==========================================\n');

      // Validate response
      if (!response.data || !response.data.status) {
        throw new Error('Invalid response from m.Stock API');
      }

      return response.data;
    } catch (error) {
      // Log detailed error information
      console.error('=== m.Stock API Error Details ===');
      console.error('Error message:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received from m.Stock API');
        console.error('Request details:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      console.error('================================');

      // Handle authentication errors
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logger.error('m.Stock access token expired or invalid');
        throw new Error('m.Stock access token expired or invalid');
      }

      logger.error('Error fetching prices from m.Stock:', error.message);
      throw error;
    }
  }

  /**
   * Extract LTP values from m.Stock response
   * @param {Object} mStockResponse - Response from m.Stock API
   * @returns {Object} Extracted prices { symbol: price }
   */
  extractPrices(mStockResponse) {
    try {
      const prices = {};
      
      if (mStockResponse.data) {
        for (const [symbol, data] of Object.entries(mStockResponse.data)) {
          if (data && data.ltp !== undefined) {
            // Remove exchange prefix (NSE:RELIANCE -> RELIANCE)
            const cleanSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
            prices[cleanSymbol] = data.ltp;
          }
        }
      }

      console.log('Extracted prices (cleaned symbols):', prices);
      return prices;
    } catch (error) {
      logger.error('Error extracting prices from m.Stock response:', error.message);
      throw error;
    }
  }
}

// Singleton instance
export default new MStockTypeBService();
