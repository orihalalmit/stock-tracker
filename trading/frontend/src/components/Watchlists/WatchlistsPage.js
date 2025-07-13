import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import StockCard from '../StockCard';
import { useAuth } from '../Auth/AuthContext';
import './WatchlistsPage.css';

const WatchlistsPage = () => {
  const [watchlists, setWatchlists] = useState([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [newWatchlistDescription, setNewWatchlistDescription] = useState('');
  const [showPremarket, setShowPremarket] = useState(false);
  const { user, token } = useAuth();
  
  // Use ref to track selected watchlist without causing re-renders
  const selectedWatchlistRef = useRef(null);

  // Initialize showPremarket from localStorage
  useEffect(() => {
    const savedShowPremarket = localStorage.getItem('showPremarket');
    if (savedShowPremarket !== null) {
      setShowPremarket(JSON.parse(savedShowPremarket));
    }
  }, []);

  // Save showPremarket to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('showPremarket', JSON.stringify(showPremarket));
  }, [showPremarket]);

  const selectWatchlist = useCallback(async (watchlistId) => {
    try {
      const url = `/api/watchlist/${watchlistId}${showPremarket ? '?include_premarket=true' : ''}`;
      const response = await axios.get(url);
      setSelectedWatchlist(response.data);
      selectedWatchlistRef.current = response.data;
      
      // Save to localStorage
      localStorage.setItem('lastSelectedWatchlistId', watchlistId);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching watchlist details:', err);
      setError('Failed to fetch watchlist details');
    }
  }, [showPremarket]);

  const fetchWatchlists = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/watchlist');
      setWatchlists(response.data);
      
      // Try to restore last selected watchlist from localStorage
      const lastSelectedId = localStorage.getItem('lastSelectedWatchlistId');
      let watchlistToSelect = null;
      
      if (lastSelectedId) {
        // Check if the last selected watchlist still exists
        watchlistToSelect = response.data.find(w => w._id === lastSelectedId);
      }
      
      // If last selected doesn't exist or no last selected, use first watchlist
      if (!watchlistToSelect && response.data.length > 0) {
        watchlistToSelect = response.data[0];
      }
      
      // Select the determined watchlist if none currently selected
      if (watchlistToSelect && !selectedWatchlistRef.current) {
        await selectWatchlist(watchlistToSelect._id);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching watchlists:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Failed to fetch watchlists: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setLoading(false);
    }
  }, [selectWatchlist]); // Removed selectedWatchlist dependency

  useEffect(() => {
    if (user && token) {
      fetchWatchlists();
    }
  }, [fetchWatchlists, user, token]);

  // Re-fetch current watchlist when premarket toggle changes
  useEffect(() => {
    if (selectedWatchlistRef.current) {
      selectWatchlist(selectedWatchlistRef.current._id);
    }
  }, [showPremarket, selectWatchlist]); // Removed selectedWatchlist dependency

  const createWatchlist = async (e) => {
    e.preventDefault();
    
    if (!newWatchlistName.trim()) {
      setError('Watchlist name is required');
      return;
    }

    try {
      const response = await axios.post('/api/watchlist', {
        name: newWatchlistName.trim(),
        description: newWatchlistDescription.trim()
      });
      
      setNewWatchlistName('');
      setNewWatchlistDescription('');
      setShowCreateForm(false);
      await fetchWatchlists();
      
      // Auto-select the newly created watchlist
      if (response.data && response.data._id) {
        await selectWatchlist(response.data._id);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error creating watchlist:', err);
      setError('Failed to create watchlist');
    }
  };

  const deleteWatchlist = async (watchlistId) => {
    if (!window.confirm('Are you sure you want to delete this watchlist?')) {
      return;
    }

    try {
      await axios.delete(`/api/watchlist/${watchlistId}`);
      
      // If we deleted the selected watchlist, clear selection
      if (selectedWatchlistRef.current && selectedWatchlistRef.current._id === watchlistId) {
        setSelectedWatchlist(null);
        selectedWatchlistRef.current = null;
      }
      
      // Remove from localStorage if it was the last selected
      const lastSelectedId = localStorage.getItem('lastSelectedWatchlistId');
      if (lastSelectedId === watchlistId) {
        localStorage.removeItem('lastSelectedWatchlistId');
      }
      
      await fetchWatchlists();
      setError(null);
    } catch (err) {
      console.error('Error deleting watchlist:', err);
      setError('Failed to delete watchlist');
    }
  };

  const addStockToWatchlist = async () => {
    if (!selectedWatchlistRef.current) return;
    
    const symbol = prompt('Enter stock symbol (e.g., AAPL):');
    if (!symbol) return;

    try {
      await axios.post(`/api/watchlist/${selectedWatchlistRef.current._id}/items`, {
        symbol: symbol.toUpperCase()
      });
      
      await selectWatchlist(selectedWatchlistRef.current._id);
      setError(null);
    } catch (err) {
      console.error('Error adding stock to watchlist:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to add stock to watchlist');
      }
    }
  };

  const removeStockFromWatchlist = async (symbol) => {
    if (!selectedWatchlistRef.current) return;
    
    if (!window.confirm(`Remove ${symbol} from watchlist?`)) {
      return;
    }

    try {
      await axios.delete(`/api/watchlist/${selectedWatchlistRef.current._id}/items/${symbol}`);
      await selectWatchlist(selectedWatchlistRef.current._id);
      setError(null);
    } catch (err) {
      console.error('Error removing stock from watchlist:', err);
      setError('Failed to remove stock from watchlist');
    }
  };

  if (loading && watchlists.length === 0) {
    return (
      <div className="watchlists-page">
        <div className="loading">Loading watchlists...</div>
      </div>
    );
  }

  return (
    <div className="watchlists-page">
      <div className="watchlists-header">
        <h1>Watchlists</h1>
        <div className="header-actions">
          <div className="premarket-toggle">
            <input
              type="checkbox"
              id="extended-hours-toggle"
              checked={showPremarket}
              onChange={(e) => setShowPremarket(e.target.checked)}
            />
            <label htmlFor="extended-hours-toggle">Extended Hours Analysis</label>
          </div>
          <button 
            className="create-watchlist-btn"
            onClick={() => setShowCreateForm(true)}
          >
            Create Watchlist
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-error">×</button>
        </div>
      )}

      {showCreateForm && (
        <div className="create-watchlist-form">
          <form onSubmit={createWatchlist}>
            <h3>Create New Watchlist</h3>
            <input
              type="text"
              placeholder="Watchlist name"
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={newWatchlistDescription}
              onChange={(e) => setNewWatchlistDescription(e.target.value)}
              rows="3"
            />
            <div className="form-actions">
              <button type="submit">Create</button>
              <button 
                type="button" 
                onClick={() => {
                  setShowCreateForm(false);
                  setNewWatchlistName('');
                  setNewWatchlistDescription('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="watchlists-content">
        <div className="watchlists-sidebar">
          <h3>My Watchlists</h3>
          {watchlists.length === 0 ? (
            <div className="no-watchlists">
              <p>No watchlists yet.</p>
              <button 
                className="create-first-watchlist"
                onClick={() => setShowCreateForm(true)}
              >
                Create your first watchlist
              </button>
            </div>
          ) : (
            <div className="watchlists-list">
              {watchlists.map((watchlist) => (
                <div 
                  key={watchlist._id} 
                  className={`watchlist-item ${selectedWatchlist?._id === watchlist._id ? 'selected' : ''}`}
                  onClick={() => selectWatchlist(watchlist._id)}
                >
                  <div className="watchlist-info">
                    <h4>{watchlist.name}</h4>
                    <p>{watchlist.items?.length || 0} stocks</p>
                    {watchlist.description && (
                      <p className="description">{watchlist.description}</p>
                    )}
                  </div>
                  <button 
                    className="delete-watchlist"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteWatchlist(watchlist._id);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="watchlist-details">
          {selectedWatchlist ? (
            <>
              <div className="watchlist-details-header">
                <div>
                  <h2>{selectedWatchlist.name}</h2>
                  {selectedWatchlist.description && (
                    <p className="watchlist-description">{selectedWatchlist.description}</p>
                  )}
                  <p className="stock-count">{selectedWatchlist.stockData?.length || 0} stocks</p>
                </div>
                <div className="header-controls">
                  <label className="premarket-toggle">
                    <input
                      type="checkbox"
                      checked={showPremarket}
                      onChange={(e) => setShowPremarket(e.target.checked)}
                    />
                    <span className="toggle-label">Show Pre-Market</span>
                  </label>
                  <button 
                    className="add-stock-btn"
                    onClick={addStockToWatchlist}
                  >
                    + Add Stock
                  </button>
                </div>
              </div>

              {selectedWatchlist.stockData && selectedWatchlist.stockData.length > 0 ? (
                <div className="watchlist-stocks">
                  <div className="stocks-grid">
                    {selectedWatchlist.stockData.map((stock) => (
                      <div key={stock.symbol} className="watchlist-stock-card">
                        <StockCard 
                          stock={{
                            symbol: stock.symbol,
                            price: stock.currentPrice || 0,
                            change: stock.change || 0,
                            changePercent: stock.changePercent || 0,
                            volume: stock.volume || 0,
                            high: stock.high || 0,
                            low: stock.low || 0,
                            open: stock.previousClose || stock.currentPrice || 0,
                            preMarketData: stock.preMarketData,
                            intradayData: stock.intradayData
                          }} 
                          showPremarket={showPremarket}
                        />
                        <button 
                          className="remove-stock-btn"
                          onClick={() => removeStockFromWatchlist(stock.symbol)}
                          title="Remove from watchlist"
                        >
                          ×
                        </button>
                        {stock.notes && (
                          <div className="stock-notes">
                            <p>{stock.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-watchlist">
                  <p>This watchlist is empty.</p>
                  <button 
                    className="add-first-stock"
                    onClick={addStockToWatchlist}
                  >
                    Add your first stock
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="no-watchlist-selected">
              <p>Select a watchlist to view its stocks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchlistsPage; 