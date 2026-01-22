import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { adminAPI } from '../../services/api';

const AutocompleteWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #4a90e2;
    box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
  }

  &:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }
`;

const SuggestionsList = styled.ul`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  padding: 0;
  list-style: none;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
`;

const SuggestionItem = styled.li`
  padding: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  font-weight: 500;

  &:hover {
    background-color: #f0f7ff;
  }

  &:not(:last-child) {
    border-bottom: 1px solid #f0f0f0;
  }

  &.highlighted {
    background-color: #e3f2fd;
  }
`;

const NoResults = styled.div`
  padding: 12px;
  text-align: center;
  color: #999;
  font-size: 14px;
`;

const LoadingText = styled.div`
  padding: 12px;
  text-align: center;
  color: #666;
  font-size: 14px;
`;

const SymbolAutocomplete = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Search stock symbol...",
  disabled = false 
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceTimer = useRef(null);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchSymbols = async (query) => {
    console.log('🔍 Searching symbols for query:', query);
    
    if (!query || query.length < 1) {
      console.log('⚠️ Query too short, clearing suggestions');
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      console.log('📡 Calling API: searchSymbols with query:', query);
      const response = await adminAPI.searchSymbols(query, 50);
      console.log('✅ API Response:', response);
      
      if (response.success) {
        console.log('📋 Found symbols:', response.symbols?.length || 0);
        setSuggestions(response.symbols || []);
        setShowSuggestions(true);
      } else {
        console.warn('⚠️ API returned success=false');
        setSuggestions([]);
      }
    } catch (error) {
      console.error('❌ Error searching symbols:', error);
      console.error('Error details:', error.message, error.response);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value.toUpperCase();
    console.log('⌨️ Input changed to:', newValue);
    setInputValue(newValue);
    setHighlightedIndex(-1);
    
    if (onChange) {
      onChange(newValue);
    }

    // Debounce the search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      console.log('⏱️ Debounce complete, triggering search for:', newValue);
      searchSymbols(newValue);
    }, 300);
  };

  const handleSelectSuggestion = (symbol) => {
    setInputValue(symbol);
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    
    if (onSelect) {
      onSelect(symbol);
    }
    if (onChange) {
      onChange(symbol);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  return (
    <AutocompleteWrapper ref={wrapperRef}>
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      
      {showSuggestions && (
        <SuggestionsList>
          {loading ? (
            <LoadingText>Searching...</LoadingText>
          ) : suggestions.length > 0 ? (
            suggestions.map((symbol, index) => (
              <SuggestionItem
                key={symbol}
                onClick={() => handleSelectSuggestion(symbol)}
                className={index === highlightedIndex ? 'highlighted' : ''}
              >
                {symbol}
              </SuggestionItem>
            ))
          ) : (
            <NoResults>No symbols found</NoResults>
          )}
        </SuggestionsList>
      )}
    </AutocompleteWrapper>
  );
};

export default SymbolAutocomplete;
