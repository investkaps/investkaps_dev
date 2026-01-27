import ltpService from '../services/ltpService.js';
import logger from '../utils/logger.js';

/**
 * Fetch single stock price
 * GET /api/ltp/single?exchange=NSE&symbol=TCS
 */
export const getSinglePrice = async (req, res) => {
  try {
    console.log('\n=== LTP CONTROLLER: GET SINGLE PRICE ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request URL:', req.url);
    console.log('Request Method:', req.method);
    console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request Query:', JSON.stringify(req.query, null, 2));
    console.log('User:', req.user ? { id: req.user._id, email: req.user.email } : 'Not authenticated');
    
    const { exchange, symbol } = req.query;

    console.log('Parsed Parameters:', { exchange, symbol });

    if (!exchange || !symbol) {
      console.log('❌ Validation failed: Missing parameters');
      return res.status(400).json({
        success: false,
        error: 'Exchange and symbol are required'
      });
    }

    console.log('Calling LTP Service...');
    const result = await ltpService.fetchSinglePrice(exchange.toUpperCase(), symbol.toUpperCase());
    console.log('✅ LTP Service returned successfully');
    console.log('Result:', JSON.stringify(result, null, 2));

    const response = {
      success: true,
      data: result
    };
    
    console.log('✅ Sending response:', JSON.stringify(response, null, 2));
    console.log('=== END GET SINGLE PRICE ===\n');
    
    return res.status(200).json(response);
  } catch (error) {
    console.log('❌ ERROR IN GET SINGLE PRICE CONTROLLER');
    console.log('Error Type:', error.constructor.name);
    console.log('Error Message:', error.message);
    console.log('Error Stack:', error.stack);
    console.log('=== END GET SINGLE PRICE (ERROR) ===\n');
    logger.error(`Error in getSinglePrice: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Fetch batch prices from same exchange
 * POST /api/ltp/batch
 * Body: { exchange: "NSE", symbols: ["TCS", "RELIANCE", "INFY"] }
 */
export const getBatchPrices = async (req, res) => {
  try {
    console.log('\n=== LTP CONTROLLER: GET BATCH PRICES ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request URL:', req.url);
    console.log('Request Method:', req.method);
    console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user ? { id: req.user._id, email: req.user.email } : 'Not authenticated');
    
    const { exchange, symbols } = req.body;

    console.log('Parsed Body:', { exchange, symbols });

    if (!exchange || !symbols || !Array.isArray(symbols) || symbols.length === 0) {
      console.log('❌ Validation failed: Invalid body');
      return res.status(400).json({
        success: false,
        error: 'Exchange and symbols array are required'
      });
    }

    console.log('Calling LTP Service...');
    const result = await ltpService.fetchBatchPrices(
      exchange.toUpperCase(),
      symbols.map(s => s.toUpperCase())
    );
    console.log('✅ LTP Service returned successfully');
    console.log('Result:', JSON.stringify(result, null, 2));

    const response = {
      success: true,
      data: result
    };
    
    console.log('✅ Sending response:', JSON.stringify(response, null, 2));
    console.log('=== END GET BATCH PRICES ===\n');
    
    return res.status(200).json(response);
  } catch (error) {
    console.log('❌ ERROR IN GET BATCH PRICES CONTROLLER');
    console.log('Error Type:', error.constructor.name);
    console.log('Error Message:', error.message);
    console.log('Error Stack:', error.stack);
    console.log('=== END GET BATCH PRICES (ERROR) ===\n');
    logger.error(`Error in getBatchPrices: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Fetch prices across multiple exchanges
 * POST /api/ltp/multi
 * Body: { items: [{ exchange: "NSE", symbol: "TCS" }, { exchange: "BSE", symbol: "TCS" }] }
 */
export const getMultiExchangePrices = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required'
      });
    }

    // Validate each item has exchange and symbol
    for (const item of items) {
      if (!item.exchange || !item.symbol) {
        return res.status(400).json({
          success: false,
          error: 'Each item must have exchange and symbol'
        });
      }
    }

    const normalizedItems = items.map(item => ({
      exchange: item.exchange.toUpperCase(),
      symbol: item.symbol.toUpperCase()
    }));

    const result = await ltpService.fetchMultiExchangePrices(normalizedItems);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Error in getMultiExchangePrices: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Smart fetch - automatically chooses best endpoint
 * POST /api/ltp/smart
 * Body: { items: [{ exchange: "NSE", symbol: "TCS" }] }
 */
export const smartFetchPrices = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required'
      });
    }

    const normalizedItems = items.map(item => ({
      exchange: (item.exchange || 'NSE').toUpperCase(),
      symbol: item.symbol.toUpperCase()
    }));

    const prices = await ltpService.smartFetch(normalizedItems);

    return res.status(200).json({
      success: true,
      prices: prices
    });
  } catch (error) {
    logger.error(`Error in smartFetchPrices: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Fetch prices for stock recommendations (optimized for admin panel)
 * POST /api/ltp/recommendations
 * Body: { recommendations: [{ stockSymbol: "TCS", exchange: "NSE" }] }
 */
export const getRecommendationPrices = async (req, res) => {
  try {
    const { recommendations } = req.body;

    if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recommendations array is required'
      });
    }

    const prices = await ltpService.fetchRecommendationPrices(recommendations);

    return res.status(200).json({
      success: true,
      prices: prices
    });
  } catch (error) {
    logger.error(`Error in getRecommendationPrices: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
