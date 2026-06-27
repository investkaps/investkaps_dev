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

    const response = await axios.get(`${this.baseURL}/ltp/multi`, {
      params: { items: syms.map(s => `${exch}:${s}`).join(',') },
      timeout: this.timeout,
    });

    const prices = {};
    for (const sym of syms) {
      prices[sym] = response.data.prices?.[`${exch}:${sym}`] ?? null;
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
      const response   = await axios.get(`${this.baseURL}/ltp/multi`, {
        params: { items: itemsParam },
        timeout: this.timeout,
      });
      Object.assign(results, response.data.prices || {});
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

    if (items.length === 1) {
      const { exchange, symbol } = items[0];
      const result = await this.fetchSinglePrice(exchange, symbol);
      return { [`${exchange.toUpperCase()}:${symbol.toUpperCase()}`]: result.ltp };
    }

    const grouped   = this.groupByExchange(items);
    const exchanges = Object.keys(grouped);

    if (exchanges.length === 1) {
      const exchange = exchanges[0];
      const result   = await this.fetchBatchPrices(exchange, grouped[exchange]);
      const normalized = {};
      for (const [sym, price] of Object.entries(result.prices)) {
        normalized[`${exchange}:${sym}`] = price;
      }
      return normalized;
    }

    const result = await this.fetchMultiExchangePrices(items);
    return result.prices;
  }

  /**
   * Prices for a list of recommendation objects.
   * recommendations: [{ stockSymbol, exchange? }]
   * Returns: { SYMBOL: price }  (simple format for backwards compat)
   */
  async fetchRecommendationPrices(recommendations) {
    const items = recommendations.map(r => ({
      exchange: (r.exchange || 'NSE').toUpperCase(),
      symbol:   r.stockSymbol.toUpperCase(),
    }));

    const prices = await this.smartFetch(items);

    // Convert "NSE:TCS" → "TCS"
    const simple = {};
    for (const [key, price] of Object.entries(prices)) {
      const sym = key.includes(':') ? key.split(':')[1] : key;
      simple[sym] = price;
    }
    return simple;
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
