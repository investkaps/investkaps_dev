import mongoose from 'mongoose';
import logger from '../utils/logger.js';

// Lightweight schema — no model file needed, collection managed by app.py
const Instrument = mongoose.models.Instrument || mongoose.model(
  'Instrument',
  new mongoose.Schema({
    exchange:       { type: String },
    symbol:         { type: String },
    name:           { type: String },
    // NFO-only fields
    expiry:         { type: String },
    strike:         { type: Number },
    lotSize:        { type: Number },
    instrumentType: { type: String },
  }, { collection: 'instruments', timestamps: false })
);

export const searchSymbols = async (req, res) => {
  try {
    const { query, limit = 50 } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter is required' });
    }

    const q     = query.trim().toUpperCase();
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const lim   = Math.min(parseInt(limit) || 50, 200);

    const results = await Instrument.aggregate([
      { $match: { $or: [{ symbol: regex }, { name: regex }] } },
      {
        $addFields: {
          _score: {
            $switch: {
              branches: [
                { case: { $eq: ['$symbol', q] },                                          then: 0 },
                { case: { $regexMatch: { input: '$symbol', regex: `^${q}`, options: 'i' } }, then: 1 },
                { case: { $regexMatch: { input: '$name',   regex: `^${q}`, options: 'i' } }, then: 2 },
                { case: { $regexMatch: { input: '$symbol', regex: q,       options: 'i' } }, then: 3 },
              ],
              default: 4,
            },
          },
        },
      },
      { $sort: { _score: 1, symbol: 1 } },
      { $limit: lim },
      { $project: { _id: 0, _score: 0 } },
    ]);

    return res.status(200).json({ success: true, query: q, count: results.length, symbols: results });
  } catch (error) {
    logger.error(`Error searching symbols: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to search symbols' });
  }
};

export const getAllSymbols = async (req, res) => {
  try {
    const { page = 1, limit = 100, exchange } = req.query;
    const lim    = Math.min(parseInt(limit) || 100, 500);
    const skip   = (Math.max(parseInt(page) || 1, 1) - 1) * lim;
    const filter = exchange ? { exchange: exchange.toUpperCase() } : {};

    const [total, symbols] = await Promise.all([
      Instrument.countDocuments(filter),
      Instrument.find(filter, { _id: 0, __v: 0 }).skip(skip).limit(lim).lean(),
    ]);

    return res.status(200).json({ success: true, total, page: parseInt(page), limit: lim, symbols });
  } catch (error) {
    logger.error(`Error fetching symbols: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to fetch symbols' });
  }
};

// Kept for backwards-compatible admin route — no-op now since DB is source of truth
export const reloadSymbols = async (req, res) => {
  try {
    const total = await Instrument.countDocuments();
    return res.status(200).json({ success: true, message: 'Symbols served from MongoDB', count: total });
  } catch (error) {
    logger.error(`Error in reloadSymbols: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Failed to count symbols' });
  }
};
