import StockRecommendation from '../model/StockRecommendation.js';
import mStockTypeBService from '../services/mStockTypeBService.js';
import logger from '../utils/logger.js';

/**
 * Fetch and update stock prices from m.Stock
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateStockPrices = async (req, res) => {
  try {
    console.log('\n=== STOCK PRICE UPDATE REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    
    const { symbols } = req.body;

    // Validate input
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      console.log('❌ Validation failed: Symbols array is required');
      return res.status(400).json({
        success: false,
        error: 'Symbols array is required'
      });
    }
    
    console.log('✅ Validation passed. Symbols:', symbols);

    // Fetch live prices from m.Stock
    const mStockResponse = await mStockTypeBService.fetchLivePrices(symbols);
    
    // Extract prices
    const prices = mStockTypeBService.extractPrices(mStockResponse);

    console.log('Updating stockRecommendations prices');
    console.log('Symbols to update:', Object.keys(prices));
    console.log('Prices to apply:', prices);

    // Update database
    const updated = [];
    const updatePromises = [];

    for (const [symbol, price] of Object.entries(prices)) {
      const updatePromise = StockRecommendation.updateMany(
        { stockSymbol: symbol },
        {
          $set: {
            currentPrice: price,
            lastPriceUpdatedAt: new Date()
          }
        }
      ).then(result => {
        if (result.modifiedCount > 0) {
          updated.push(symbol);
          logger.info(`Updated ${result.modifiedCount} record(s) for ${symbol} with price ${price}`);
        } else {
          logger.warn(`No records found for symbol: ${symbol}`);
        }
      });

      updatePromises.push(updatePromise);
    }

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    console.log('Database update complete');
    console.log('Updated symbols:', updated);

    // Return clean response to frontend
    const responsePayload = {
      success: true,
      updated,
      prices
    };
    
    console.log('\n=== RESPONSE TO FRONTEND ===');
    console.log('Status: 200');
    console.log('Payload:', JSON.stringify(responsePayload, null, 2));
    console.log('============================\n');
    
    return res.status(200).json(responsePayload);

  } catch (error) {
    console.error('\n=== ERROR IN CONTROLLER ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('===========================\n');
    
    logger.error('Error updating stock prices:', error.message);

    // Handle specific errors
    if (error.message.includes('token expired') || error.message.includes('invalid')) {
      const errorResponse = {
        success: false,
        error: 'Authentication failed. Token may be expired.'
      };
      console.log('Sending 401 response:', errorResponse);
      return res.status(401).json(errorResponse);
    }

    const errorResponse = {
      success: false,
      error: 'Failed to update stock prices',
      details: error.message
    };
    console.log('Sending 500 response:', errorResponse);
    return res.status(500).json(errorResponse);
  }
};

/**
 * Get current stock prices from database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getStockPrices = async (req, res) => {
  try {
    const { symbols } = req.query;

    if (!symbols) {
      return res.status(400).json({
        success: false,
        error: 'Symbols parameter is required'
      });
    }

    const symbolArray = symbols.split(',').map(s => s.trim());

    const stocks = await StockRecommendation.find({
      stockSymbol: { $in: symbolArray }
    }).select('stockSymbol stockName currentPrice lastPriceUpdatedAt');

    const prices = {};
    stocks.forEach(stock => {
      prices[stock.stockSymbol] = {
        name: stock.stockName,
        price: stock.currentPrice,
        lastUpdated: stock.lastPriceUpdatedAt
      };
    });

    return res.status(200).json({
      success: true,
      prices
    });

  } catch (error) {
    logger.error('Error fetching stock prices:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stock prices'
    });
  }
};
