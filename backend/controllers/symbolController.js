import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for symbols to avoid reading file on every request
let symbolsCache = null;
let lastLoadTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load symbols from symbols.json file
 * @returns {Array<string>} Array of stock symbols
 */
function loadSymbols() {
  try {
    // Check if cache is still valid
    if (symbolsCache && lastLoadTime && (Date.now() - lastLoadTime < CACHE_DURATION)) {
      return symbolsCache;
    }

    const symbolsPath = path.join(__dirname, '..', 'symbols.json');
    
    if (!fs.existsSync(symbolsPath)) {
      logger.error('symbols.json file not found');
      return [];
    }

    const data = fs.readFileSync(symbolsPath, 'utf-8');
    symbolsCache = JSON.parse(data);
    lastLoadTime = Date.now();
    
    logger.info(`Loaded ${symbolsCache.length} symbols from symbols.json`);
    return symbolsCache;
  } catch (error) {
    logger.error(`Error loading symbols: ${error.message}`);
    return [];
  }
}

/**
 * Search symbols based on query
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const searchSymbols = async (req, res) => {
  try {
    const { query, limit = 50 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const symbols = loadSymbols();

    if (symbols.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Symbols data not available'
      });
    }

    // Search for symbols that start with or contain the query (case-insensitive)
    const searchQuery = query.toUpperCase().trim();
    
    // Priority 1: Exact match
    const exactMatch = symbols.filter(symbol => symbol === searchQuery);
    
    // Priority 2: Starts with query
    const startsWith = symbols.filter(symbol => 
      symbol.startsWith(searchQuery) && symbol !== searchQuery
    );
    
    // Priority 3: Contains query
    const contains = symbols.filter(symbol => 
      symbol.includes(searchQuery) && 
      !symbol.startsWith(searchQuery) && 
      symbol !== searchQuery
    );

    // Combine results with priority
    const results = [...exactMatch, ...startsWith, ...contains].slice(0, parseInt(limit));

    return res.status(200).json({
      success: true,
      query: searchQuery,
      count: results.length,
      symbols: results
    });

  } catch (error) {
    logger.error(`Error searching symbols: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to search symbols'
    });
  }
};

/**
 * Get all symbols (with pagination)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllSymbols = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;

    const symbols = loadSymbols();

    if (symbols.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Symbols data not available'
      });
    }

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedSymbols = symbols.slice(startIndex, endIndex);

    return res.status(200).json({
      success: true,
      total: symbols.length,
      page: parseInt(page),
      limit: parseInt(limit),
      symbols: paginatedSymbols
    });

  } catch (error) {
    logger.error(`Error fetching all symbols: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch symbols'
    });
  }
};

/**
 * Reload symbols cache (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const reloadSymbols = async (req, res) => {
  try {
    symbolsCache = null;
    lastLoadTime = null;
    
    const symbols = loadSymbols();

    return res.status(200).json({
      success: true,
      message: 'Symbols cache reloaded',
      count: symbols.length
    });

  } catch (error) {
    logger.error(`Error reloading symbols: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to reload symbols'
    });
  }
};
