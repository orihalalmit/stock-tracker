import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './StockSearchModal.css';

const StockSearchModal = ({ isOpen, onClose, onAddStock, sectionName, sectionId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionRefs = useRef([]);

  // Determine section type based on section name
  const getSectionType = (sectionName) => {
    const name = sectionName?.toLowerCase() || '';
    if (name.includes('currency') || name.includes('forex')) {
      return 'currency';
    } else if (name.includes('bitcoin') || name.includes('crypto') || name.includes('ethereum')) {
      return 'crypto';
    }
    return 'stock';
  };

  const sectionType = getSectionType(sectionName);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search for symbols as user types
  useEffect(() => {
    const searchSymbols = async () => {
      if (searchQuery.length < 1) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get(`/api/market/search/${searchQuery}?section_type=${sectionType}`);
        setSuggestions(response.data.suggestions || []);
        setSelectedIndex(-1);
        setError('');
      } catch (err) {
        console.error('Error searching symbols:', err);
        setSuggestions([]);
        if (err.response?.status === 401) {
          setError('Authentication required. Please log in again.');
        } else {
          setError('Failed to search symbols. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchSymbols, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, sectionType]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleAddStock(suggestions[selectedIndex].symbol);
      } else if (searchQuery.trim()) {
        handleAddStock(searchQuery.trim().toUpperCase());
      }
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  const handleAddStock = async (symbol) => {
    if (!symbol) return;

    setError('');
    setLoading(true);

    try {
      await onAddStock(symbol);
      handleClose();
    } catch (err) {
      console.error('Error adding stock:', err);
      setError(err.message || 'Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSuggestions([]);
    setSelectedIndex(-1);
    setError('');
    onClose();
  };

  const handleSuggestionClick = (symbol) => {
    handleAddStock(symbol);
  };

  const getPlaceholderText = () => {
    switch (sectionType) {
      case 'currency':
        return 'Search for currencies (e.g., EUR, USD, GBP)';
      case 'crypto':
        return 'Search for crypto (e.g., BTC, ETH, COIN)';
      default:
        return 'Search for stocks (e.g., AAPL, Tesla, Apple)';
    }
  };

  const getSectionTypeLabel = () => {
    switch (sectionType) {
      case 'currency':
        return 'Currency/Forex';
      case 'crypto':
        return 'Cryptocurrency';
      default:
        return 'Stock';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="stock-search-modal-overlay" onClick={handleClose}>
      <div className="stock-search-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add {getSectionTypeLabel()} to {sectionName}</h3>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="search-input-container">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholderText()}
              className="search-input"
              disabled={loading}
            />
            <div className="search-icon">🔍</div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {loading && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <span>Searching...</span>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="suggestions-container">
              <div className="suggestions-header">
                <span>{getSectionTypeLabel()} Suggestions</span>
                <span className="suggestions-count">{suggestions.length} found</span>
              </div>
              <div className="suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.symbol}
                    ref={el => suggestionRefs.current[index] = el}
                    className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => handleSuggestionClick(suggestion.symbol)}
                  >
                    <div className="suggestion-symbol">{suggestion.symbol}</div>
                    <div className="suggestion-name">{suggestion.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchQuery && suggestions.length === 0 && !loading && !error && (
            <div className="no-suggestions">
              <div className="no-suggestions-text">
                No {getSectionTypeLabel().toLowerCase()} suggestions found for "{searchQuery}"
              </div>
              <div className="manual-add">
                <button
                  className="manual-add-button"
                  onClick={() => handleAddStock(searchQuery.trim().toUpperCase())}
                  disabled={loading}
                >
                  Add "{searchQuery.toUpperCase()}" anyway
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="keyboard-hints">
            <span className="hint">↑↓ Navigate</span>
            <span className="hint">Enter Add</span>
            <span className="hint">Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockSearchModal; 