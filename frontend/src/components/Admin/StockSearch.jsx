import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../../services/api';
import { formatStockForDisplay } from '../../utils/stockUtils';
import './StockSearch.css';

const StockSearch = ({ onSelectStock, initialValue = '' }) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // Search for stocks when query changes
  useEffect(() => {
    const searchStocks = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await adminAPI.searchStocks(query);
        if (response.success) {
          setResults(response.data);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('Error searching stocks:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timer = setTimeout(() => {
      searchStocks();
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle stock selection
  const handleSelectStock = async (stock) => {
    setSelectedStock(stock);
    setQuery(`${stock.symbol} - ${stock.name}`);
    setShowResults(false);

    // Get detailed stock information with current price
    try {
      setLoading(true);
      const response = await adminAPI.getStockDetails(stock.symbol);
      
      if (response.success) {
        onSelectStock(response.data);
      } else {
        // Fallback to basic stock data
        onSelectStock({ 
          stock,
          forRecommendation: {
            stockSymbol: stock.symbol,
            stockName: stock.name,
            currentPrice: 0
          }
        });
      }
    } catch (error) {
      console.error('Error getting stock details:', error);
      onSelectStock({ 
        stock,
        forRecommendation: {
          stockSymbol: stock.symbol,
          stockName: stock.name,
          currentPrice: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stock-search-container">
      <div className="stock-search-input-container" ref={searchRef}>
        <input
          type="text"
          className="stock-search-input"
          placeholder="Search for stocks (e.g., RELIANCE, TCS)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
        />
        {loading && <div className="stock-search-spinner"></div>}
      </div>

      {showResults && (
        <div className="stock-search-results" ref={resultsRef}>
          {results.length === 0 ? (
            <div className="stock-search-no-results">
              {query.length < 2 ? 'Type at least 2 characters to search' : 'No stocks found'}
            </div>
          ) : (
            <ul className="stock-search-results-list">
              {results.map((stock) => {
                const formattedStock = formatStockForDisplay(stock);
                return (
                  <li
                    key={`${stock.symbol}-${stock.region}`}
                    className="stock-search-result-item"
                    onClick={() => handleSelectStock(stock)}
                  >
                    <div className="stock-search-result-symbol">{formattedStock.symbol}</div>
                    <div className="stock-search-result-name">{formattedStock.name}</div>
                    <div className="stock-search-result-exchange">
                      {formattedStock.region} • {formattedStock.type}
                    </div>
                    <div className="stock-search-result-price" style={{ color: '#0d6efd', fontWeight: 'bold', fontSize: '12px' }}>
                      {formattedStock.currency} • Match: {(parseFloat(formattedStock.matchScore) * 100).toFixed(0)}%
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default StockSearch;
