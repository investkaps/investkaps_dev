import axios from 'axios';
import logger from '../utils/logger.js';

const NFO_EXCHANGES = new Set(['NFO', 'BFO', 'CDS', 'MCX']);

class LTPService {
  constructor() {
    this.baseURL = process.env.LTP_API_URL || 'https://mstock-ltp.onrender.com';
    this.timeout = 10000;
  }

  /**
   * Single price — equity goes to /ltp, derivatives go to /ltp/nfo.
   */
  async fetchSinglePrice(exchange, symbol) {
    const exch = exchange.toUpperCase();
    const sym  = symbol.toUpperCase();

    if (NFO_EXCHANGES.has(exch)) {
      const key    = `${exch}:${sym}`;
      const prices = await this._fetchNfoKeys([key]);
      return { exchange: exch, symbol: sym, ltp: prices[key] ?? null };
    }

    const response = await axios.get(`${this.baseURL}/ltp`, {
      params: { exchange: exch, symbol: sym },
      timeout: this.timeout,
    });
    logger.info(`LTP fetched: ${exch}:${sym} = ${response.data.ltp}`);
    return response.data;
  }

  /**
   * Batch prices on same exchange.
   * For NFO/derivatives, routes to /ltp/nfo.
   */
  async fetchBatchPrices(exchange, symbols) {
    const exch = exchange.toUpperCase();
    const syms = symbols.map(s => s.toUpperCase());

    if (NFO_EXCHANGES.has(exch)) {
      const keys   = syms.map(s => `${exch}:${s}`);
      const prices = await this._fetchNfoKeys(keys);
      const mapped = {};
      syms.forEach(s => { mapped[s] = prices[`${exch}:${s}`] ?? null; });
      return { exchange: exch, prices: mapped };
    }

    // Fetch each symbol individually — sequential per exchange to avoid overloading the LTP API
    const prices = {};
    for (const sym of syms) {
      try {
        const result = await this.fetchSinglePrice(exch, sym);
        prices[sym] = result.ltp ?? null;
      } catch (err) {
        logger.warn(`fetchSinglePrice failed for ${exch}:${sym}: ${err.message}`);
        prices[sym] = null;
      }
    }
    return { exchange: exch, prices };
  }

  /**
   * Multi-exchange prices — splits equity and derivatives, merges results.
   * items: [{ exchange, symbol }]
   */
  async fetchMultiExchangePrices(items) {
    const equity = items.filter(i => !NFO_EXCHANGES.has(i.exchange.toUpperCase()));
    const nfo    = items.filter(i =>  NFO_EXCHANGES.has(i.exchange.toUpperCase()));

    const results = {};

    if (equity.length) {
      const itemsParam = equity.map(i => `${i.exchange.toUpperCase()}:${i.symbol.toUpperCase()}`).join(',');
      let rawPrices = {};
      try {
        const response = await axios.get(`${this.baseURL}/ltp/multi`, {
          params: { items: itemsParam },
          timeout: this.timeout,
        });
        rawPrices = response.data.prices || {};
      } catch (err) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail || err.message;
        logger.warn(`fetchMultiExchangePrices equity leg failed with ${status}: ${detail} — returning nulls for equity items`);
      }
      // Normalize app.py response keys (e.g. "NSE:TCS-EQ", "BSE:TCS-A") back to "EXCHANGE:SYMBOL"
      for (const item of equity) {
        const exch = item.exchange.toUpperCase();
        const sym  = item.symbol.toUpperCase();
        const matchingKey = Object.keys(rawPrices).find(k => k.startsWith(`${exch}:`) && k.split(':')[1]?.startsWith(sym));
        results[`${exch}:${sym}`] = matchingKey != null ? rawPrices[matchingKey] : null;
      }
    }

    if (nfo.length) {
      const keys   = nfo.map(i => `${i.exchange.toUpperCase()}:${i.symbol.toUpperCase()}`);
      const prices = await this._fetchNfoKeys(keys);
      Object.assign(results, prices);
    }

    return { prices: results };
  }

  /**
   * Auto-routes to the most efficient endpoint.
   */
  async smartFetch(items) {
    if (!items || items.length === 0) throw new Error('Items array cannot be empty');

    // Group by exchange and fetch each exchange sequentially — one at a time
    const grouped = this.groupByExchange(items);
    const normalized = {};

    for (const [exchange, symbols] of Object.entries(grouped)) {
      const result = await this.fetchBatchPrices(exchange, symbols);
      for (const [sym, price] of Object.entries(result.prices)) {
        normalized[`${exchange}:${sym}`] = price;
      }
    }

    return normalized;
  }

  /**
   * Prices for a list of recommendation objects.
   * recommendations: [{ stockSymbol, exchange? }]
   * Returns: { SYMBOL: price }
   * Key is the raw stockSymbol (trading symbol) — works for equity and NFO.
   * If two recs share a symbol on different exchanges the last one wins,
   * but that is an edge case and both prices should be identical anyway.
   */
  async fetchRecommendationPrices(recommendations) {
    const items = recommendations.map(r => {
      let exch = (r.exchange || 'NSE').toUpperCase();
      const sym = r.stockSymbol.toUpperCase();
      // If the exchange is equity (NSE/BSE) but the symbol looks like a derivative,
      // reroute to the appropriate F&O exchange so it hits /ltp/nfo instead of /ltp/multi.
      // Patterns caught: expiry codes (26AUG, 25JAN25) and FUT/CE/PE suffixes.
      if ((exch === 'NSE' || exch === 'BSE') && /(\d{2}[A-Z]{3}(\d{2})?|FUT$|CE$|PE$)/.test(sym)) {
        exch = exch === 'BSE' ? 'BFO' : 'NFO';
      }
      return { exchange: exch, symbol: sym };
    });

    const prices = await this.smartFetch(items);

    // smartFetch returns { "EXCHANGE:SYMBOL": price }.
    // Build a map keyed by the raw symbol so the frontend can do prices[rec.stockSymbol].
    const bySymbol = {};
    for (const [key, price] of Object.entries(prices)) {
      const sym = key.includes(':') ? key.split(':').slice(1).join(':') : key;
      bySymbol[sym] = price;
    }
    return bySymbol;
  }

  groupByExchange(items) {
    const grouped = {};
    for (const item of items) {
      const exch = item.exchange.toUpperCase();
      if (!grouped[exch]) grouped[exch] = [];
      grouped[exch].push(item.symbol.toUpperCase());
    }
    return grouped;
  }

  // Calls app.py /ltp/nfo — no -EQ suffix, raw instrument keys
  async _fetchNfoKeys(keys) {
    const response = await axios.get(`${this.baseURL}/ltp/nfo`, {
      params: { keys: keys.join(',') },
      timeout: this.timeout,
    });
    return response.data.prices || {};
  }
}

export default new LTPService();
