import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from './components/Header';
import StockCard from './components/StockCard';
import CurrencyCard from './components/CurrencyCard';
import BitcoinCard from './components/BitcoinCard';
import LoadingSpinner from './components/LoadingSpinner';
import PortfolioPage from './components/Portfolio/PortfolioPage';
import WatchlistsPage from './components/Watchlists/WatchlistsPage';
import { AuthProvider, useAuth } from './components/Auth/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import AdminPanel from './components/Admin/AdminPanel';
import StockSearchModal from './components/StockSearchModal';
import './App.css';

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('portfolio'); // market, portfolio, watchlists, admin
  const [stocks, setStocks] = useState([]);
  const [usdIls, setUsdIls] = useState(null);
  const [bitcoin, setBitcoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [marketConfig, setMarketConfig] = useState(null);
  const [isEditingMarket, setIsEditingMarket] = useState(false);
  const [stockSearchModal, setStockSearchModal] = useState({ isOpen: false, sectionId: null, sectionName: '' });
  const { user, loading: authLoading, logout, isAdmin } = useAuth();

  const fetchUsdIlsData = async () => {
    try {
      const response = await axios.get('/api/forex/usdils');
      setUsdIls(response.data);
    } catch (err) {
      console.error('Error fetching USD/ILS data:', err);
      setUsdIls({
        symbol: 'USD/ILS',
        rate: 0,
        previousRate: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
        timestamp: new Date().toISOString(),
        lastUpdated: 'N/A',
        error: 'Failed to fetch rate'
      });
    }
  };

  const fetchBitcoinData = async () => {
    try {
      const response = await axios.get('/api/crypto/bitcoin');
      setBitcoin(response.data);
    } catch (err) {
      console.error('Error fetching Bitcoin data:', err);
      setBitcoin({
        symbol: 'BTC/USD',
        price: 0,
        previousPrice: 0,
        dailyChange: 0,
        dailyChangePercent: 0,
        timestamp: new Date().toISOString(),
        error: 'Failed to fetch Bitcoin price'
      });
    }
  };

  const fetchMarketConfig = async () => {
    try {
      console.log('Fetching market config...');
      const response = await axios.get('/api/market/config');
      console.log('Market config fetched successfully:', response.data);
      setMarketConfig(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching market config:', err);
      setError('Failed to load market configuration: ' + (err.response?.data?.error || err.message));
      // Return default config if API fails
      const defaultConfig = {
        sections: [
          { name: 'Currency', symbols: [], enabled: true },
          { name: 'Major Indices & ETFs', symbols: ['SPY', 'QQQ', 'IWM', 'RSP', 'MAGS'], enabled: true },
          { name: 'Volatility ETFs', symbols: ['VXX', 'UVXY', 'SVXY'], enabled: true },
          { name: 'Individual Stocks', symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'PLTR', 'HIMS'], enabled: true },
          { name: 'Bitcoin & Ethereum', symbols: ['IBIT', 'ETHE', 'ETHW'], enabled: true }
        ]
      };
      console.log('Using default config:', defaultConfig);
      setMarketConfig(defaultConfig);
      return defaultConfig;
    }
  };

  const fetchStockData = async () => {
    try {
      setLoading(true);
      
      // Get market configuration
      const config = marketConfig || await fetchMarketConfig();
      
      // Collect all symbols from ALL enabled sections (including Currency and Bitcoin & Ethereum)
      const allSymbols = new Set();
      config.sections
        .filter(section => section.enabled)
        .forEach(section => {
          section.symbols.forEach(symbol => allSymbols.add(symbol));
        });
      
      const tickers = Array.from(allSymbols);
      console.log('Fetching data for all symbols:', tickers);
      
      // Fetch stock data, USD/ILS data, and Bitcoin data in parallel
      const [stockResponse] = await Promise.all([
        axios.get(`/api/stocks/snapshots?symbols=${tickers.join(',')}`),
        fetchUsdIlsData(),
        fetchBitcoinData()
      ]);

      const snapshots = stockResponse.data.snapshots || {};
      const processedStocks = Object.entries(snapshots).map(([symbol, data]) => ({
        symbol,
        price: data.latestTrade?.p || data.latestQuote?.ap || 0,
        change: data.latestTrade ? (data.latestTrade.p - data.prevDailyBar?.c) : 0,
        changePercent: data.prevDailyBar?.c ? 
          ((data.latestTrade?.p || data.latestQuote?.ap || 0) - data.prevDailyBar.c) / data.prevDailyBar.c * 100 : 0,
        volume: data.dailyBar?.v || 0,
        high: data.dailyBar?.h || 0,
        low: data.dailyBar?.l || 0,
        open: data.dailyBar?.o || data.prevDailyBar?.c || 0,
        previousClose: data.prevDailyBar?.c || 0
      }));

      console.log('Processed stocks:', processedStocks.length, 'symbols');
      console.log('Stock symbols received:', processedStocks.map(s => s.symbol));

      setStocks(processedStocks);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError('Failed to fetch stock data: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'market' && user) {
      console.log('Market tab activated, marketConfig exists:', !!marketConfig);
      
      // Fetch market config first, then stock data
      const initializeMarketData = async () => {
        if (!marketConfig) {
          console.log('Market config not loaded, fetching...');
          await fetchMarketConfig();
        }
        console.log('Fetching stock data...');
        await fetchStockData();
      };
      
      initializeMarketData();
      
      // Auto-refresh every 30 seconds only when market tab is active
      const interval = setInterval(() => {
        console.log('Auto-refreshing stock data...');
        fetchStockData();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [activeTab, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Market configuration editing functions
  const editSection = (section) => {
    const newName = prompt('Enter section name:', section.name);
    if (newName && newName !== section.name) {
      updateSection(section._id, { name: newName });
    }
  };

  const updateSection = async (sectionId, updates) => {
    try {
      await axios.put(`/api/market/config/sections/${sectionId}`, updates);
      await fetchMarketConfig();
      await fetchStockData();
    } catch (err) {
      console.error('Error updating section:', err);
      setError('Failed to update section');
    }
  };

  const deleteSection = async (sectionId) => {
    if (!window.confirm('Are you sure you want to delete this section?')) return;
    
    try {
      await axios.delete(`/api/market/config/sections/${sectionId}`);
      await fetchMarketConfig();
      await fetchStockData();
    } catch (err) {
      console.error('Error deleting section:', err);
      setError('Failed to delete section');
    }
  };

  const addStockToSection = async (sectionId, sectionName) => {
    console.log('🚀 Opening stock search modal for section:', sectionName, 'ID:', sectionId);
    setStockSearchModal({
      isOpen: true,
      sectionId,
      sectionName
    });
  };

  const handleAddStock = async (symbol) => {
    const { sectionId } = stockSearchModal;
    
    console.log('🚀 handleAddStock called with symbol:', symbol, 'sectionId:', sectionId);
    console.log('🔍 Current user:', user);
    console.log('🔍 Auth token exists:', !!axios.defaults.headers.common['Authorization']);
    
    if (!sectionId) {
      throw new Error('No section ID provided');
    }
    
    const upperSymbol = symbol.toUpperCase().trim();
    if (!upperSymbol) {
      throw new Error('Please enter a valid stock symbol');
    }
    
    try {
      console.log('📡 Making API request to add stock...');
      console.log('📡 Request URL:', `/api/market/config/sections/${sectionId}/symbols`);
      console.log('📡 Request data:', { symbol: upperSymbol });
      
      const response = await axios.post(`/api/market/config/sections/${sectionId}/symbols`, { 
        symbol: upperSymbol 
      });
      
      console.log('✅ Stock added successfully:', response.data);
      
      // Update the market config state
      setMarketConfig(response.data);
      
      // Refresh stock data to include the new symbol
      await fetchStockData();
      
      console.log(`✅ Successfully added ${upperSymbol} to the section!`);
      
    } catch (err) {
      console.error('❌ Error adding stock to section:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      
      let errorMsg;
      if (err.response?.status === 401) {
        errorMsg = 'Authentication required. Please log in again.';
      } else if (err.response?.status === 400 && err.response?.data?.error?.includes('already exists')) {
        errorMsg = `${upperSymbol} is already in this section`;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else {
        errorMsg = `Failed to add stock: ${err.message}`;
      }
      
      throw new Error(errorMsg);
    }
  };

  const removeStockFromSection = async (sectionId, symbol) => {
    if (!window.confirm(`Remove ${symbol} from this section?`)) return;
    
    try {
      await axios.delete(`/api/market/config/sections/${sectionId}/symbols/${symbol}`);
      await fetchMarketConfig();
      await fetchStockData();
    } catch (err) {
      console.error('Error removing stock from section:', err);
      setError('Failed to remove stock from section');
    }
  };

  const addNewSection = async () => {
    const name = prompt('Enter section name:');
    if (!name) return;
    
    try {
      await axios.post('/api/market/config/sections', { name });
      await fetchMarketConfig();
    } catch (err) {
      console.error('Error adding new section:', err);
      setError('Failed to add new section');
    }
  };

  const renderContent = () => {
    if (activeTab === 'market') {
      if (loading && stocks.length === 0) {
        return <LoadingSpinner />;
      }
      
      return (
        <>
          {error && (
            <div className="error-message">
              {error}
              <button onClick={fetchStockData} className="retry-button">
                Retry
              </button>
            </div>
          )}
          
          <div className="market-overview">
            {isEditingMarket && (
              <div className="market-edit-controls">
                <button 
                  className="add-section-btn"
                  onClick={addNewSection}
                >
                  ➕ Add New Section
                </button>
                <button 
                  className="save-config-btn"
                  onClick={() => setIsEditingMarket(false)}
                >
                  ✓ Save Changes
                </button>
                <button 
                  className="cancel-edit-btn"
                  onClick={() => setIsEditingMarket(false)}
                >
                  ✕ Cancel
                </button>
              </div>
            )}
            
            {!isEditingMarket && (
              <div className="market-controls">
                <button 
                  className="edit-market-btn"
                  onClick={() => setIsEditingMarket(true)}
                >
                  ⚙️ Customize Your Market Overview
                </button>
                <div className="market-controls-hint">
                  Personalize your market sections and add your favorite stocks
                </div>
              </div>
            )}
            
            {marketConfig && marketConfig.sections && (
              console.log('Rendering sections:', marketConfig.sections.length) || 
              marketConfig.sections
                .filter(section => section.enabled)
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                <div key={section._id || section.name} className="market-section">
                  <div className="section-header">
                    <h2 className="section-title">{section.name}</h2>
                    {console.log(`Section ${section.name} has symbols:`, section.symbols) || null}
                    {isEditingMarket && (
                      <div className="section-edit-controls">
                        <button 
                          className="edit-section-btn"
                          onClick={() => editSection(section)}
                          title="Edit section name"
                        >
                          ✏️
                        </button>
                        <button 
                          className="delete-section-btn"
                          onClick={() => deleteSection(section._id)}
                          title="Delete section"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="stocks-grid">
                    {section.name === 'Currency' && usdIls && (
                      <CurrencyCard currency={usdIls} />
                    )}
                    
                    {section.name === 'Bitcoin & Ethereum' && bitcoin && (
                      <BitcoinCard bitcoin={bitcoin} />
                    )}
                    
                    {section.symbols && stocks
                      .filter(stock => {
                        const isIncluded = section.symbols.includes(stock.symbol);
                        if (!isIncluded) {
                          console.log(`Stock ${stock.symbol} not in section ${section.name} symbols:`, section.symbols);
                        }
                        return isIncluded;
                      })
                      .map((stock) => {
                        console.log(`Rendering stock card for ${stock.symbol} in section ${section.name}`);
                        return (
                          <div key={stock.symbol} className="stock-card-container">
                            <StockCard stock={stock} />
                            {isEditingMarket && (
                              <button 
                                className="remove-stock-btn"
                                onClick={() => removeStockFromSection(section._id, stock.symbol)}
                                title={`Remove ${stock.symbol} from ${section.name}`}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                    
                    {isEditingMarket && (
                      <div className="add-stock-card">
                        <button 
                          className="add-stock-btn"
                          onClick={() => addStockToSection(section._id, section.name)}
                        >
                          <div className="add-stock-icon">📈</div>
                          <div className="add-stock-text">Add Stock</div>
                          <div className="add-stock-hint">Search and add stocks to this section</div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <StockSearchModal
            isOpen={stockSearchModal.isOpen}
            onClose={() => setStockSearchModal({ isOpen: false, sectionId: null, sectionName: '' })}
            onAddStock={handleAddStock}
            sectionName={stockSearchModal.sectionName}
            sectionId={stockSearchModal.sectionId}
          />
        </>
      );
    } else if (activeTab === 'portfolio') {
      return <PortfolioPage />;
    } else if (activeTab === 'watchlists') {
      return <WatchlistsPage />;
    } else if (activeTab === 'insights') {
      return <PortfolioPage activeView="insights" />;
    } else if (activeTab === 'admin' && isAdmin()) {
      return <AdminPanel />;
    }
  };

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="app">
      <Header 
        lastUpdated={activeTab === 'market' ? lastUpdated : null}
        onRefresh={activeTab === 'market' ? fetchStockData : null}
        user={user}
        onLogout={logout}
        isAdmin={isAdmin()}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />


      <div className="content">
        {renderContent()}
      </div>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App; 