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
      
      // Collect all symbols from enabled sections
      const allSymbols = new Set();
      config.sections
        .filter(section => section.enabled && section.name !== 'Currency' && section.name !== 'Bitcoin & Ethereum')
        .forEach(section => {
          section.symbols.forEach(symbol => allSymbols.add(symbol));
        });
      
      const tickers = Array.from(allSymbols);
      
      // Fetch stock data, USD/ILS data, and Bitcoin data in parallel
      const [stockResponse] = await Promise.all([
        axios.get(`/api/stocks/snapshots?symbols=${tickers.join(',')}`),
        fetchUsdIlsData(),
        fetchBitcoinData()
      ]);
      
      if (stockResponse.data && stockResponse.data.snapshots) {
        const stockData = Object.entries(stockResponse.data.snapshots)
          .filter(([symbol, data]) => {
            // Filter out symbols with no data
            return data && (data.latestTrade?.p || data.latestQuote?.ap || data.latestQuote?.bp);
          })
          .map(([symbol, data]) => {
            // Use latestTrade price if available, otherwise use latestQuote ask/bid
            const currentPrice = data.latestTrade?.p || data.latestQuote?.ap || data.latestQuote?.bp || 0;
            const openPrice = data.dailyBar?.o || 0;
            const prevClose = data.prevDailyBar?.c || 0;
            
            // Calculate change from previous close if available, otherwise from open
            const referencePrice = prevClose || openPrice;
            const change = referencePrice ? (currentPrice - referencePrice) : 0;
            const changePercent = referencePrice ? ((change / referencePrice) * 100) : 0;
            
            return {
              symbol,
              price: currentPrice,
              change,
              changePercent,
              volume: data.dailyBar?.v || 0,
              high: data.dailyBar?.h || 0,
              low: data.dailyBar?.l || 0,
              open: openPrice,
              close: prevClose
            };
          });
        
        setStocks(stockData);
        setLastUpdated(new Date());
        
        // Show info message if some symbols were filtered out
        if (stockData.length < tickers.length) {
          console.log(`Note: ${tickers.length - stockData.length} symbols were not available or had no data`);
          console.log('Note: VIX, TA35, and TA125 are not supported by Alpaca API. Using VXX, UVXY, SVXY as VIX alternatives.');
        }
        
        setError(null);
      } else {
        setError('No market data available. Please check your API configuration.');
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError('Failed to fetch stock data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load market config on app start
  useEffect(() => {
    console.log('App mounted, loading market config...');
    fetchMarketConfig();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'market') {
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
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Market configuration editing functions
  const editSection = (section) => {
    const newName = prompt('Enter section name:', section.name);
    if (newName && newName !== section.name) {
      updateSection(section._id, { name: newName });
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

  const addStockToSection = async (sectionId) => {
    console.log('🚀 addStockToSection called with sectionId:', sectionId);
    
    // Validate sectionId
    if (!sectionId) {
      console.error('❌ No sectionId provided!');
      alert('Error: No section ID provided');
      return;
    }
    
    const symbol = prompt('Enter stock symbol (e.g., AAPL):');
    if (!symbol) {
      console.log('ℹ️ User cancelled stock addition');
      return;
    }
    
    const upperSymbol = symbol.toUpperCase().trim();
    if (!upperSymbol) {
      console.log('❌ Invalid symbol entered:', symbol);
      setError('Please enter a valid stock symbol');
      alert('Please enter a valid stock symbol');
      return;
    }
    
    console.log('📝 Processing add stock request:');
    console.log('  - Section ID:', sectionId);
    console.log('  - Symbol:', upperSymbol);
    console.log('  - API URL:', `/api/market/config/sections/${sectionId}/symbols`);
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 Making API request...');
      const response = await axios.post(`/api/market/config/sections/${sectionId}/symbols`, { 
        symbol: upperSymbol 
      });
      
      console.log('✅ API Response received:');
      console.log('  - Status:', response.status);
      console.log('  - Data:', response.data);
      
      // Update the market config state immediately
      console.log('🔄 Updating market config state...');
      setMarketConfig(response.data);
      
      // Refresh stock data to include the new symbol
      console.log('📊 Refreshing stock data...');
      await fetchStockData();
      
      // Show success message
      const successMsg = `✅ Successfully added ${upperSymbol} to the section!`;
      console.log(successMsg);
      alert(successMsg);
      
    } catch (err) {
      console.error('❌ Error adding stock to section:', err);
      console.error('❌ Error details:');
      console.error('  - Status:', err.response?.status);
      console.error('  - Data:', err.response?.data);
      console.error('  - Message:', err.message);
      
      let errorMsg;
      if (err.response?.status === 400 && err.response?.data?.error?.includes('already exists')) {
        errorMsg = `${upperSymbol} is already in this section`;
      } else if (err.response?.data?.error) {
        errorMsg = `Failed to add stock: ${err.response.data.error}`;
      } else {
        errorMsg = `Failed to add stock: ${err.message}`;
      }
      
      setError(errorMsg);
      alert(errorMsg);
      
    } finally {
      setLoading(false);
      console.log('🏁 addStockToSection completed');
    }
  };

  const addNewSection = async () => {
    const name = prompt('Enter new section name:');
    if (!name) return;
    
    try {
      await axios.post('/api/market/config/sections', { name, symbols: [] });
      await fetchMarketConfig();
    } catch (err) {
      console.error('Error adding new section:', err);
      setError('Failed to add new section');
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

  const removeStockFromSection = async (sectionId, symbol) => {
    if (!window.confirm(`Are you sure you want to remove ${symbol} from this section?`)) return;
    
    try {
      console.log('Removing stock from section:', sectionId, symbol);
      setLoading(true);
      const response = await axios.delete(`/api/market/config/sections/${sectionId}/symbols/${symbol}`);
      
      // Update the market config state immediately
      setMarketConfig(response.data);
      
      // Refresh stock data
      await fetchStockData();
      setError(null);
      
      console.log(`Successfully removed ${symbol} from section`);
    } catch (err) {
      console.error('Error removing stock from section:', err);
      setError('Failed to remove stock from section: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
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
                  ⚙️ Customize Sections
                </button>
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
                    {isEditingMarket && (
                      <div className="section-edit-controls">
                        <button 
                          className="edit-section-btn"
                          onClick={() => editSection(section)}
                        >
                          ✏️
                        </button>
                        <button 
                          className="delete-section-btn"
                          onClick={() => deleteSection(section._id)}
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
                      .filter(stock => section.symbols.includes(stock.symbol))
                      .map((stock) => (
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
                      ))}
                    
                    {isEditingMarket && (
                      <div className="add-stock-card">
                        <button 
                          className="add-stock-btn"
                          onClick={() => {
                            console.log('Add stock button clicked for section:', section.name, 'ID:', section._id);
                            addStockToSection(section._id);
                          }}
                        >
                          + Add Stock
                        </button>
                        <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '0.5rem' }}>
                          Section: {section.name}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {isEditingMarket && (
              <div className="add-section-area">
                <button 
                  className="add-section-btn"
                  onClick={addNewSection}
                >
                  + Add New Section
                </button>
              </div>
            )}
          </div>
          
          {stocks.length === 0 && !loading && (
            <div className="no-data">
              <p>No stock data available.</p>
              <button onClick={fetchStockData} className="retry-button">
                Load Data
              </button>
            </div>
          )}
        </>
      );
    }

    // Handle watchlists tab
    if (activeTab === 'watchlists') {
      return <WatchlistsPage />;
    }

    // Handle admin tab
    if (activeTab === 'admin') {
      return <AdminPanel />;
    }

    // Handle portfolio tab (includes both management and insights as sub-tabs)
    return <PortfolioPage activeView="management" />;
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="app">
        <div className="loading-container">
          <LoadingSpinner />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return (
      <div className="app">
        <AuthPage />
      </div>
    );
  }

  return (
    <div className="app">
      <Header 
        lastUpdated={activeTab === 'market' ? lastUpdated : null}
        onRefresh={activeTab === 'market' ? fetchStockData : null}
        user={user}
        onLogout={logout}
        isAdmin={isAdmin()}
      />

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'market' ? 'active' : ''}`}
          onClick={() => setActiveTab('market')}
        >
          Market Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setActiveTab('portfolio')}
        >
          Portfolio
        </button>
        <button
          className={`tab-button ${activeTab === 'watchlists' ? 'active' : ''}`}
          onClick={() => setActiveTab('watchlists')}
        >
          Watchlists
        </button>
        {isAdmin() && (
          <button
            className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            Admin Panel
          </button>
        )}
      </div>

      <div className="content">
        {renderContent()}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App; 