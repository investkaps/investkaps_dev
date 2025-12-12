const axios = require('axios');
const logger = require('./logger');
const ZerodhaToken = require('../model/ZerodhaToken');

const API_KEY = process.env.ZERODHA_API_KEY;
const BASE_URL = 'https://api.kite.trade';

/**
 * Get active access token from database
 * @returns {Promise<string>} Access token
 */
const getAccessToken = async () => {
  try {
    const tokenDoc = await ZerodhaToken.findOne({ isActive: true }).sort({ updatedAt: -1 });
    
    if (!tokenDoc) {
      throw new Error('No active Zerodha access token found. Please set token from admin panel.');
    }
    
    return tokenDoc.accessToken;
  } catch (error) {
    logger.error('Error getting Zerodha access token:', error);
    throw error;
  }
};

/**
 * Make authenticated request to Zerodha API
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {object} data - Request data
 * @returns {Promise<object>} API response
 */
const makeZerodhaRequest = async (endpoint, method = 'GET', data = null) => {
  try {
    const accessToken = await getAccessToken();
    
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `token ${API_KEY}:${accessToken.trim()}`,
        'X-Kite-Version': '3',
        'Content-Type': 'application/json'
      }
    };
    
    if (data && method !== 'GET') {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    logger.error('Zerodha API request failed:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get quote for instruments
 * @param {array} instruments - Array of instrument symbols (e.g., ['NSE:INFY', 'BSE:SENSEX'])
 * @returns {Promise<object>} Quote data
 */
const getQuote = async (instruments) => {
  try {
    if (!instruments || instruments.length === 0) {
      throw new Error('Instruments array is required');
    }
    
    // Join instruments with '&i=' for multiple instruments
    const instrumentsParam = instruments.map(i => `i=${encodeURIComponent(i)}`).join('&');
    const endpoint = `/quote?${instrumentsParam}`;
    
    const response = await makeZerodhaRequest(endpoint);
    return response;
  } catch (error) {
    logger.error('Error getting quote:', error);
    throw error;
  }
};

/**
 * Get LTP (Last Traded Price) for instruments
 * @param {array} instruments - Array of instrument symbols
 * @returns {Promise<object>} LTP data
 */
const getLTP = async (instruments) => {
  try {
    if (!instruments || instruments.length === 0) {
      throw new Error('Instruments array is required');
    }
    
    const instrumentsParam = instruments.map(i => `i=${encodeURIComponent(i)}`).join('&');
    const endpoint = `/quote/ltp?${instrumentsParam}`;
    
    const response = await makeZerodhaRequest(endpoint);
    return response;
  } catch (error) {
    logger.error('Error getting LTP:', error);
    throw error;
  }
};

/**
 * Get OHLC (Open, High, Low, Close) for instruments
 * @param {array} instruments - Array of instrument symbols
 * @returns {Promise<object>} OHLC data
 */
const getOHLC = async (instruments) => {
  try {
    if (!instruments || instruments.length === 0) {
      throw new Error('Instruments array is required');
    }
    
    const instrumentsParam = instruments.map(i => `i=${encodeURIComponent(i)}`).join('&');
    const endpoint = `/quote/ohlc?${instrumentsParam}`;
    
    const response = await makeZerodhaRequest(endpoint);
    return response;
  } catch (error) {
    logger.error('Error getting OHLC:', error);
    throw error;
  }
};

/**
 * Search instruments - fetches CSV from Zerodha and parses it
 * @param {string} query - Search query
 * @param {string} exchange - Exchange (NSE, BSE, etc.)
 * @returns {Promise<array>} Matching instruments
 */
const searchInstruments = async (query, exchange = null) => {
  try {
    const accessToken = await getAccessToken();
    
    let url = `${BASE_URL}/instruments`;
    if (exchange) {
      url = `${BASE_URL}/instruments/${exchange}`;
    }
    
    // Instruments endpoint returns CSV, not JSON
    const response = await axios({
      method: 'GET',
      url: url,
      headers: {
        'Authorization': `token ${API_KEY}:${accessToken.trim()}`,
        'X-Kite-Version': '3'
      }
    });
    
    // Parse CSV response
    const csvData = response.data;
    if (typeof csvData !== 'string') {
      return [];
    }
    
    const lines = csvData.split('\n');
    if (lines.length < 2) return [];
    
    // Parse header to get column indices
    const headers = lines[0].split(',');
    const tradingsymbolIdx = headers.indexOf('tradingsymbol');
    const nameIdx = headers.indexOf('name');
    const instrumentTokenIdx = headers.indexOf('instrument_token');
    const exchangeIdx = headers.indexOf('exchange');
    
    // Parse data rows and filter by query
    const instruments = [];
    const queryUpper = query ? query.toUpperCase() : '';
    
    for (let i = 1; i < lines.length && instruments.length < 20; i++) {
      const cols = lines[i].split(',');
      if (cols.length < headers.length) continue;
      
      const tradingsymbol = cols[tradingsymbolIdx] || '';
      const name = cols[nameIdx] || '';
      
      // Filter by query if provided
      if (queryUpper && !tradingsymbol.toUpperCase().includes(queryUpper) && 
          !name.toUpperCase().includes(queryUpper)) {
        continue;
      }
      
      instruments.push({
        tradingsymbol: tradingsymbol,
        name: name,
        instrument_token: cols[instrumentTokenIdx],
        exchange: cols[exchangeIdx]
      });
    }
    
    return instruments;
  } catch (error) {
    logger.error('Error searching instruments:', error.message);
    throw error;
  }
};

module.exports = {
  getAccessToken,
  makeZerodhaRequest,
  getQuote,
  getLTP,
  getOHLC,
  searchInstruments
};
