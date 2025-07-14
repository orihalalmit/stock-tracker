const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');
const AlpacaService = require('./services/alpacaService');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Alpaca service
const alpacaService = new AlpacaService();

// Debug environment variables
console.log('Environment variables check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);

// Security warnings for production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
    console.warn('⚠️  WARNING: JWT_SECRET is not set or using default value in production!');
    console.warn('⚠️  Please set a secure JWT_SECRET in your environment variables.');
  }
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  WARNING: ADMIN_PASSWORD is not set. Admin user will not be created.');
  }
}

// Connect to MongoDB
connectDB();

// Initialize admin user
const User = require('./models/User');
setTimeout(async () => {
  try {
    await User.createAdminUser();
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}, 2000); // Wait 2 seconds for DB connection

// Alpaca API configuration
const ALPACA_CONFIG = {
  apiKey: process.env.ALPACA_API_KEY,
  secretKey: process.env.ALPACA_SECRET_KEY,
  baseURL: process.env.ALPACA_BASE_URL
};

// Helper function to get Alpaca API headers
function getAlpacaHeaders() {
  return {
    'APCA-API-KEY-ID': ALPACA_CONFIG.apiKey,
    'APCA-API-SECRET-KEY': ALPACA_CONFIG.secretKey
  };
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app build directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// Import routes
const portfolioRoutes = require('./routes/portfolio');
const watchlistRoutes = require('./routes/watchlist');
const marketRoutes = require('./routes/market');
const authRoutes = require('./routes/auth');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/market', marketRoutes);

// Get API service statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = alpacaService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get current stock prices
app.get('/api/stocks/latest', async (req, res) => {
  try {
    const symbols = req.query.symbols;
    if (!symbols) {
      return res.json({});
    }
    
    const data = await alpacaService.getQuotes(symbols);
    res.json(data);
  } catch (error) {
    console.error('Error fetching latest quotes:', error.message);
    res.status(500).json({ error: 'Failed to fetch stock quotes' });
  }
});

// Get stock bars (daily data)
app.get('/api/stocks/bars', async (req, res) => {
  try {
    const symbols = req.query.symbols;
    if (!symbols) {
      return res.json({ bars: {} });
    }
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const data = await alpacaService.getBars(symbols, '1Day', startDate, endDate);
    res.json(data);
  } catch (error) {
    console.error('Error fetching bars:', error.message);
    res.status(500).json({ error: 'Failed to fetch stock bars' });
  }
});

// Get stock snapshots (includes price and daily change)
app.get('/api/stocks/snapshots', async (req, res) => {
  try {
    const symbols = req.query.symbols;
    const includePremarket = req.query.include_premarket === 'true';
    
    if (!symbols) {
      return res.json({ snapshots: {}, errors: [], warnings: [] });
    }
    
    const symbolsArray = symbols.split(',').map(s => s.trim().toUpperCase());
    console.log('Fetching snapshots for symbols:', symbolsArray);
    
    // Separate symbols by type
    const stockSymbols = [];
    const forexSymbols = [];
    const cryptoSymbols = [];
    
    symbolsArray.forEach(symbol => {
      if (symbol.includes('=X') || symbol.includes('USD') || symbol.includes('EUR') || symbol.includes('GBP') || symbol.includes('JPY') || symbol.includes('CAD') || symbol.includes('AUD') || symbol.includes('CHF') || symbol.includes('SEK') || symbol.includes('NOK') || symbol.includes('DKK')) {
        // Don't add single "USD" to forex symbols
        if (symbol !== 'USD') {
          forexSymbols.push(symbol);
        }
      } else if (symbol.includes('BTC') || symbol.includes('ETH') || symbol === 'ETH' || symbol === 'BTC') {
        cryptoSymbols.push(symbol);
      } else {
        stockSymbols.push(symbol);
      }
    });
    
    console.log('Stock symbols:', stockSymbols);
    console.log('Forex symbols:', forexSymbols);
    console.log('Crypto symbols:', cryptoSymbols);
    
    let result = { snapshots: {}, errors: [], warnings: [] };
    
    // Fetch stock data from Alpaca
    if (stockSymbols.length > 0) {
      try {
        const stockResult = await alpacaService.getSnapshots(stockSymbols.join(','), includePremarket);
        result.snapshots = { ...result.snapshots, ...stockResult.snapshots };
        result.errors.push(...stockResult.errors);
        result.warnings.push(...stockResult.warnings);
      } catch (error) {
        console.error('Error fetching stock data from Alpaca:', error);
        result.errors.push('Failed to fetch stock data: ' + error.message);
      }
    }
    
    // Special handling for USD symbol (Dollar Index)
    if (symbolsArray.includes('USD')) {
      try {
        // Use Frankfurter API to get a basket of currencies against USD
        const usdBasket = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
        const response = await axios.get(`https://api.frankfurter.dev/v1/latest?base=USD&symbols=${usdBasket.join(',')}`);
        
        if (response.data && response.data.rates) {
          // Calculate a simple dollar index based on the average of these rates
          const rates = response.data.rates;
          const basketValues = Object.values(rates);
          const dollarIndexValue = 100 / (basketValues.reduce((sum, rate) => sum + rate, 0) / basketValues.length);
          
          // Get yesterday's value for comparison
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          let previousDollarIndexValue;
          try {
            const historicalResponse = await axios.get(
              `https://api.frankfurter.dev/v1/${yesterdayStr}?base=USD&symbols=${usdBasket.join(',')}`
            );
            const previousRates = historicalResponse.data.rates;
            const previousBasketValues = Object.values(previousRates);
            previousDollarIndexValue = 100 / (previousBasketValues.reduce((sum, rate) => sum + rate, 0) / previousBasketValues.length);
          } catch (histError) {
            console.log('Could not fetch historical dollar index, estimating previous value');
            // If historical data fails, estimate a reasonable previous rate
            const randomChange = (Math.random() * 0.01) - 0.005;
            previousDollarIndexValue = dollarIndexValue / (1 + randomChange);
          }
          
          // Add USD as a special symbol with dollar index value
          result.snapshots['USD'] = {
            latestTrade: { p: dollarIndexValue },
            prevDailyBar: { c: previousDollarIndexValue },
            dailyBar: { 
              o: previousDollarIndexValue, 
              h: Math.max(dollarIndexValue, previousDollarIndexValue), 
              l: Math.min(dollarIndexValue, previousDollarIndexValue),
              v: Math.floor(Math.random() * 1000000) + 100000
            }
          };
          console.log('Added USD Dollar Index data');
        }
      } catch (error) {
        console.error('Error fetching USD Dollar Index data:', error);
        // Fallback for USD
        const dollarIndexValue = 105.5;
        const randomChange = (Math.random() - 0.5) * 0.02;
        const previousDollarIndexValue = dollarIndexValue / (1 + randomChange);
        
        result.snapshots['USD'] = {
          latestTrade: { p: dollarIndexValue },
          prevDailyBar: { c: previousDollarIndexValue },
          dailyBar: { 
            o: previousDollarIndexValue, 
            h: Math.max(dollarIndexValue, previousDollarIndexValue), 
            l: Math.min(dollarIndexValue, previousDollarIndexValue),
            v: Math.floor(Math.random() * 1000000) + 100000
          }
        };
        console.log('Added fallback USD Dollar Index data');
      }
    }
    
    // Cache for forex rates
    const forexCache = {
      data: {},
      lastUpdated: {},
      cacheExpiry: 15 * 60 * 1000 // 15 minutes in milliseconds
    };

    // Helper function to get forex data from Frankfurter API
    async function getForexRateFromAPI(baseCurrency, targetCurrency) {
      try {
        const currentTime = Date.now();
        const cacheKey = `${baseCurrency}${targetCurrency}`;
        
        // Check if we have valid cached data
        if (forexCache.data[cacheKey] && forexCache.lastUpdated[cacheKey] && 
            (currentTime - forexCache.lastUpdated[cacheKey] < forexCache.cacheExpiry)) {
          console.log(`Returning cached ${baseCurrency}/${targetCurrency} data from`, new Date(forexCache.lastUpdated[cacheKey]).toISOString());
          return forexCache.data[cacheKey];
        }
        
        // If cache is expired or doesn't exist, fetch new data
        console.log(`Fetching fresh ${baseCurrency}/${targetCurrency} data from Frankfurter API`);
        const response = await axios.get(`https://api.frankfurter.dev/v1/latest?base=${baseCurrency}&symbols=${targetCurrency}`);
        
        if (response.data && response.data.rates && response.data.rates[targetCurrency]) {
          const currentRate = response.data.rates[targetCurrency];
          
          // Get yesterday's rate for comparison
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          let previousRate;
          try {
            const historicalResponse = await axios.get(
              `https://api.frankfurter.dev/v1/${yesterdayStr}?base=${baseCurrency}&symbols=${targetCurrency}`
            );
            previousRate = historicalResponse.data.rates[targetCurrency];
          } catch (histError) {
            console.log(`Could not fetch historical rate for ${baseCurrency}/${targetCurrency}, estimating previous rate`);
            // If historical data fails, estimate a reasonable previous rate
            const randomChange = (Math.random() * 0.01) - 0.005;
            previousRate = currentRate / (1 + randomChange);
          }
          
          const dailyChange = currentRate - previousRate;
          const dailyChangePercent = previousRate > 0 ? ((dailyChange / previousRate) * 100) : 0;
          
          const resultData = {
            currentRate,
            previousRate,
            dailyChange,
            dailyChangePercent
          };
          
          // Update cache
          forexCache.data[cacheKey] = resultData;
          forexCache.lastUpdated[cacheKey] = currentTime;
          
          return resultData;
        } else {
          throw new Error(`Invalid response from Frankfurter API for ${baseCurrency}/${targetCurrency}`);
        }
      } catch (error) {
        console.error(`Error fetching ${baseCurrency}/${targetCurrency} rate:`, error);
        throw error;
      }
    }

    // Fetch forex data (simulate for now - in production you'd use a forex API)
    if (forexSymbols.length > 0) {
      try {
        for (const symbol of forexSymbols) {
          let baseCurrency, targetCurrency;
          
          // Parse the forex symbol to get base and target currencies
          if (symbol.includes('=X')) {
            // Format like EURUSD=X
            const parts = symbol.replace('=X', '').split('');
            baseCurrency = parts.slice(0, 3).join('');
            targetCurrency = parts.slice(3, 6).join('');
          } else if (symbol.length === 6 && 
                    (symbol.includes('USD') || symbol.includes('EUR') || symbol.includes('GBP') || 
                     symbol.includes('JPY') || symbol.includes('CAD') || symbol.includes('AUD'))) {
            // Format like EURUSD
            baseCurrency = symbol.substring(0, 3);
            targetCurrency = symbol.substring(3, 6);
          } else {
            // Default to USD as base currency for other formats
            baseCurrency = 'USD';
            targetCurrency = symbol.replace('USD', '');
          }
          
          let forexData;
          
          try {
            forexData = await getForexRateFromAPI(baseCurrency, targetCurrency);
          } catch (apiError) {
            console.log(`API failed for ${baseCurrency}/${targetCurrency}, using fallback data`);
            // Fallback data
            const baseRate = symbol === 'EURUSD=X' || symbol === 'EURUSD' ? 1.0850 : 
                            symbol === 'GBPUSD=X' || symbol === 'GBPUSD' ? 1.2650 :
                            symbol === 'USDJPY=X' || symbol === 'USDJPY' ? 148.50 :
                            symbol === 'USDCAD=X' || symbol === 'USDCAD' ? 1.3420 :
                            symbol === 'AUDUSD=X' || symbol === 'AUDUSD' ? 0.6720 :
                            1.0000;
            
            const randomChange = (Math.random() - 0.5) * 0.02; // ±1% random change
            const currentRate = baseRate * (1 + randomChange);
            const previousRate = baseRate;
            
            forexData = {
              currentRate,
              previousRate,
              dailyChange: currentRate - previousRate,
              dailyChangePercent: ((currentRate - previousRate) / previousRate) * 100
            };
          }
          
          result.snapshots[symbol] = {
            latestTrade: { p: forexData.currentRate },
            prevDailyBar: { c: forexData.previousRate },
            dailyBar: { 
              o: forexData.previousRate, 
              h: Math.max(forexData.currentRate, forexData.previousRate), 
              l: Math.min(forexData.currentRate, forexData.previousRate),
              v: Math.floor(Math.random() * 1000000) + 100000
            }
          };
        }
        console.log('Added forex data for:', forexSymbols);
      } catch (error) {
        console.error('Error fetching forex data:', error);
        result.errors.push('Failed to fetch forex data: ' + error.message);
      }
    }
    
    // Fetch crypto data (simulate for now - in production you'd use CoinGecko or similar)
    if (cryptoSymbols.length > 0) {
      try {
        for (const symbol of cryptoSymbols) {
          const basePrice = symbol.includes('BTC') || symbol === 'BTC' ? 100000 :
                           symbol.includes('ETH') || symbol === 'ETH' ? 3500 :
                           50000;
          
          const randomChange = (Math.random() - 0.5) * 0.10; // ±5% random change
          const currentPrice = basePrice * (1 + randomChange);
          const previousPrice = basePrice;
          const change = currentPrice - previousPrice;
          
          result.snapshots[symbol] = {
            latestTrade: { p: currentPrice },
            prevDailyBar: { c: previousPrice },
            dailyBar: { 
              o: previousPrice, 
              h: Math.max(currentPrice, previousPrice), 
              l: Math.min(currentPrice, previousPrice),
              v: Math.floor(Math.random() * 10000) + 1000
            }
          };
        }
        console.log('Added crypto data for:', cryptoSymbols);
      } catch (error) {
        console.error('Error fetching crypto data:', error);
        result.errors.push('Failed to fetch crypto data: ' + error.message);
      }
    }
    
    console.log('Final result contains', Object.keys(result.snapshots).length, 'symbols');
    res.json(result);
  } catch (error) {
    console.error('Error fetching stock snapshots:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch stock snapshots',
      details: error.message,
      snapshots: {},
      errors: [error.message],
      warnings: []
    });
  }
});

// Helper functions to determine market hours
function isPreMarketHours() {
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const hour = easternTime.getHours();
  const day = easternTime.getDay();
  
  // Monday = 1, Friday = 5
  const isWeekday = day >= 1 && day <= 5;
  const isPreMarketTime = hour >= 4 && hour < 9.5; // 4:00 AM - 9:30 AM ET
  
  return isWeekday && isPreMarketTime;
}

function isAfterHours() {
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const hour = easternTime.getHours();
  const day = easternTime.getDay();
  
  // Monday = 1, Friday = 5
  const isWeekday = day >= 1 && day <= 5;
  const isAfterHoursTime = hour >= 16 && hour < 20; // 4:00 PM - 8:00 PM ET
  
  return isWeekday && isAfterHoursTime;
}

function isMarketOpen() {
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const hour = easternTime.getHours();
  const minute = easternTime.getMinutes();
  const day = easternTime.getDay();
  
  // Monday = 1, Friday = 5
  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = (hour > 9 || (hour === 9 && minute >= 30)) && hour < 16; // 9:30 AM - 4:00 PM ET
  
  return isWeekday && isMarketHours;
}

// Debug endpoint to see raw Alpaca data
app.get('/api/debug/snapshots', async (req, res) => {
  try {
    const symbols = req.query.symbols || 'AAPL';
    
    const response = await axios.get(
      `${ALPACA_CONFIG.baseURL}/stocks/snapshots?symbols=${symbols}`,
      { headers: getAlpacaHeaders() }
    );
    
    // Return raw data with some analysis
    const analysis = {};
    Object.entries(response.data).forEach(([symbol, data]) => {
      const currentPrice = data.latestTrade?.p || data.latestQuote?.ap || 0;
      const previousClose = data.prevDailyBar?.c || 0;
      const todayOpen = data.dailyBar?.o || 0;
      const todayHigh = data.dailyBar?.h || 0;
      const todayLow = data.dailyBar?.l || 0;
      const todayClose = data.dailyBar?.c || 0;
      
      analysis[symbol] = {
        rawData: data,
        analysis: {
          currentPrice,
          previousClose,
          todayOpen,
          todayHigh,
          todayLow,
          todayClose,
          calculations: {
            totalDailyChange: currentPrice - previousClose,
            totalDailyChangePercent: previousClose > 0 ? ((currentPrice - previousClose) / previousClose * 100) : 0,
            preMarketGap: todayOpen - previousClose,
            preMarketGapPercent: previousClose > 0 ? ((todayOpen - previousClose) / previousClose * 100) : 0,
            intradayChange: currentPrice - todayOpen,
            intradayChangePercent: todayOpen > 0 ? ((currentPrice - todayOpen) / todayOpen * 100) : 0
          }
        }
      };
    });
    
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching debug snapshots:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch debug snapshots', details: error.message });
  }
});

// Cache for USD/ILS exchange rate
const usdIlsCache = {
  data: null,
  lastUpdated: null,
  cacheExpiry: 15 * 60 * 1000 // 15 minutes in milliseconds
};

// Get USD/ILS exchange rate
app.get('/api/forex/usdils', async (req, res) => {
  try {
    const currentTime = Date.now();
    
    // Check if we have valid cached data
    if (usdIlsCache.data && usdIlsCache.lastUpdated && 
        (currentTime - usdIlsCache.lastUpdated < usdIlsCache.cacheExpiry)) {
      console.log('Returning cached USD/ILS data from', new Date(usdIlsCache.lastUpdated).toISOString());
      return res.json(usdIlsCache.data);
    }
    
    // If cache is expired or doesn't exist, fetch new data
    console.log('Fetching fresh USD/ILS data from Frankfurter API');
    const response = await axios.get('https://api.frankfurter.dev/v1/latest?base=USD&symbols=ILS');
    
    if (response.data && response.data.rates && response.data.rates.ILS) {
      const currentRate = response.data.rates.ILS;
      
      // Get yesterday's rate for comparison
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      let previousRate;
      try {
        const historicalResponse = await axios.get(
          `https://api.frankfurter.dev/v1/${yesterdayStr}?base=USD&symbols=ILS`
        );
        previousRate = historicalResponse.data.rates.ILS;
      } catch (histError) {
        console.log('Could not fetch historical rate, estimating previous rate');
        // If historical data fails, estimate a reasonable previous rate
        // Use a small random change (±0.5%) to simulate a realistic previous value
        const randomChange = (Math.random() * 0.01) - 0.005;
        previousRate = currentRate / (1 + randomChange);
      }
      
      const dailyChange = currentRate - previousRate;
      const dailyChangePercent = previousRate > 0 ? ((dailyChange / previousRate) * 100) : 0;
      
      const resultData = {
        symbol: 'USD/ILS',
        rate: parseFloat(currentRate.toFixed(4)),
        previousRate: parseFloat(previousRate.toFixed(4)),
        dailyChange: parseFloat(dailyChange.toFixed(4)),
        dailyChangePercent: parseFloat(dailyChangePercent.toFixed(2)),
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      // Update cache
      usdIlsCache.data = resultData;
      usdIlsCache.lastUpdated = currentTime;
      
      return res.json(resultData);
    } else {
      throw new Error('Invalid response from Frankfurter API');
    }
  } catch (error) {
    console.error('Error fetching USD/ILS rate:', error);
    
    // Check if we have stale cache data that's better than nothing
    if (usdIlsCache.data) {
      console.log('API request failed, returning stale cached data');
      return res.json({
        ...usdIlsCache.data,
        error: 'Using stale cached data'
      });
    }
    
    // Return fallback data if no cache is available
    const currentRate = 3.75; // Fallback rate
    const previousRate = 3.73; // Fallback previous rate
    const dailyChange = currentRate - previousRate;
    const dailyChangePercent = ((dailyChange / previousRate) * 100);
    
    const fallbackData = {
      symbol: 'USD/ILS',
      rate: currentRate,
      previousRate: previousRate,
      dailyChange: parseFloat(dailyChange.toFixed(4)),
      dailyChangePercent: parseFloat(dailyChangePercent.toFixed(2)),
      timestamp: new Date().toISOString(),
      lastUpdated: 'N/A',
      error: 'Using fallback data'
    };
    
    return res.json(fallbackData);
  }
});

// Get Bitcoin USD price from CoinGecko API
app.get('/api/crypto/bitcoin', async (req, res) => {
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
    );
    
    const data = response.data;
    if (data.bitcoin) {
      const currentPrice = data.bitcoin.usd;
      const dailyChangePercent = data.bitcoin.usd_24h_change || 0;
      const previousPrice = currentPrice / (1 + (dailyChangePercent / 100));
      const dailyChange = currentPrice - previousPrice;
      
      res.json({
        symbol: 'BTC/USD',
        price: currentPrice,
        previousPrice: previousPrice,
        dailyChange: dailyChange,
        dailyChangePercent: dailyChangePercent,
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error('Invalid response from CoinGecko API');
    }
  } catch (error) {
    console.error('Error fetching Bitcoin price:', error);
    // Return fallback Bitcoin price
    res.json({
      symbol: 'BTC/USD',
      price: 100000, // Approximate fallback
      previousPrice: 99000,
      dailyChange: 1000,
      dailyChangePercent: 1.01,
      timestamp: new Date().toISOString(),
      error: 'Using fallback data'
    });
  }
});

// Get Fear and Greed Index using Alternative.me API
app.get('/api/market/fear-greed', async (req, res) => {
  try {
    // Request 30 days of historical data to get previous close, 1 week ago, and 1 month ago
    const response = await axios.get('https://api.alternative.me/fng/?limit=30');
    const data = response.data;
    
    if (data.data && data.data.length > 0) {
      const latest = data.data[0];
      
      // Extract historical values safely
      const previousClose = data.data.length > 1 ? parseInt(data.data[1].value) : null;
      const oneWeekAgo = data.data.length > 7 ? parseInt(data.data[7].value) : null;
      const oneMonthAgo = data.data.length > 29 ? parseInt(data.data[29].value) : null;
      
      res.json({
        score: parseInt(latest.value),
        timestamp: new Date(latest.timestamp * 1000).toISOString(),
        rating: getFearGreedRating(parseInt(latest.value)),
        previousClose,
        oneWeekAgo,
        oneMonthAgo,
        oneYearAgo: null // This API doesn't provide yearly data
      });
    } else {
      throw new Error('Invalid response from Fear and Greed API');
    }
  } catch (error) {
    console.error('Error fetching Fear and Greed index:', error);
    // Return a default neutral value if the API fails
    res.json({
      score: 50,
      timestamp: new Date().toISOString(),
      rating: 'Neutral',
      previousClose: null,
      oneWeekAgo: null,
      oneMonthAgo: null,
      oneYearAgo: null
    });
  }
});

// Helper function to get Fear and Greed rating
function getFearGreedRating(score) {
  if (score >= 0 && score <= 24) return 'Extreme Fear';
  if (score >= 25 && score <= 44) return 'Fear';
  if (score >= 45 && score <= 55) return 'Neutral';
  if (score >= 56 && score <= 75) return 'Greed';
  if (score >= 76 && score <= 100) return 'Extreme Greed';
  return 'Unknown';
}

// Get actual pre-market trading data using historical bars
app.get('/api/stocks/premarket-data', async (req, res) => {
  try {
    const symbols = req.query.symbols;
    
    if (!symbols) {
      return res.json({ preMarketData: {} });
    }
    
    // Get today's date in EST
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get yesterday's date for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const symbolsArray = symbols.split(',');
    const preMarketData = {};
    
    for (const symbol of symbolsArray) {
      try {
        // Get today's extended hours bars (1-minute bars for detailed pre-market data)
        const barsResponse = await axios.get(
          `${ALPACA_CONFIG.baseURL}/stocks/bars?symbols=${symbol}&timeframe=1Min&start=${todayStr}T04:00:00Z&end=${todayStr}T13:30:00Z&asof=&feed=sip&sort=asc&limit=10000`,
          { headers: getAlpacaHeaders() }
        );
        
        // Get previous day's close price
        const prevDayResponse = await axios.get(
          `${ALPACA_CONFIG.baseURL}/stocks/bars?symbols=${symbol}&timeframe=1Day&start=${yesterdayStr}&end=${yesterdayStr}&asof=&feed=sip`,
          { headers: getAlpacaHeaders() }
        );
        
        const todayBars = barsResponse.data.bars?.[symbol] || [];
        const prevDayBars = prevDayResponse.data.bars?.[symbol] || [];
        
        if (todayBars.length === 0 || prevDayBars.length === 0) {
          preMarketData[symbol] = {
            error: 'Insufficient data',
            hasPreMarketActivity: false
          };
          continue;
        }
        
        const previousClose = prevDayBars[prevDayBars.length - 1].c;
        
        // Filter bars to get pre-market activity (4:00 AM - 9:30 AM ET)
        // Convert times to EST/EDT
        const preMarketBars = todayBars.filter(bar => {
          const barTime = new Date(bar.t);
          const hour = barTime.getUTCHours() - 5; // Convert to EST (adjust for EDT if needed)
          return hour >= 4 && hour < 9.5; // 4:00 AM to 9:30 AM
        });
        
        // Regular market bars (9:30 AM - 4:00 PM ET)
        const regularMarketBars = todayBars.filter(bar => {
          const barTime = new Date(bar.t);
          const hour = barTime.getUTCHours() - 5; // Convert to EST
          return hour >= 9.5 && hour < 16; // 9:30 AM to 4:00 PM
        });
        
        let preMarketOpen = null;
        let preMarketClose = null;
        let preMarketHigh = null;
        let preMarketLow = null;
        let preMarketVolume = 0;
        
        if (preMarketBars.length > 0) {
          preMarketOpen = preMarketBars[0].o;
          preMarketClose = preMarketBars[preMarketBars.length - 1].c;
          preMarketHigh = Math.max(...preMarketBars.map(bar => bar.h));
          preMarketLow = Math.min(...preMarketBars.map(bar => bar.l));
          preMarketVolume = preMarketBars.reduce((sum, bar) => sum + bar.v, 0);
        }
        
        // Calculate pre-market changes
        const gapChange = preMarketOpen ? (preMarketOpen - previousClose) : 0;
        const gapChangePercent = previousClose > 0 ? ((gapChange / previousClose) * 100) : 0;
        
        const preMarketChange = (preMarketOpen && preMarketClose) ? (preMarketClose - preMarketOpen) : 0;
        const preMarketChangePercent = preMarketOpen > 0 ? ((preMarketChange / preMarketOpen) * 100) : 0;
        
        const totalPreMarketChange = preMarketClose ? (preMarketClose - previousClose) : gapChange;
        const totalPreMarketChangePercent = previousClose > 0 ? ((totalPreMarketChange / previousClose) * 100) : 0;
        
        // Get regular market open (should be preMarketClose or first regular market bar)
        const regularMarketOpen = regularMarketBars.length > 0 ? regularMarketBars[0].o : preMarketClose;
        const currentPrice = regularMarketBars.length > 0 ? regularMarketBars[regularMarketBars.length - 1].c : preMarketClose;
        
        const regularSessionChange = currentPrice && regularMarketOpen ? (currentPrice - regularMarketOpen) : 0;
        const regularSessionChangePercent = regularMarketOpen > 0 ? ((regularSessionChange / regularMarketOpen) * 100) : 0;
        
        preMarketData[symbol] = {
          hasPreMarketActivity: preMarketBars.length > 0,
          previousClose,
          
          // Gap data (overnight)
          gapData: {
            change: gapChange,
            changePercent: gapChangePercent,
            from: previousClose,
            to: preMarketOpen
          },
          
          // Actual pre-market trading (4:00 AM - 9:30 AM)
          preMarketTrading: {
            open: preMarketOpen,
            close: preMarketClose,
            high: preMarketHigh,
            low: preMarketLow,
            volume: preMarketVolume,
            change: preMarketChange,
            changePercent: preMarketChangePercent,
            barsCount: preMarketBars.length
          },
          
          // Total pre-market effect (previous close to pre-market close)
          totalPreMarketEffect: {
            change: totalPreMarketChange,
            changePercent: totalPreMarketChangePercent,
            from: previousClose,
            to: preMarketClose
          },
          
          // Regular session (9:30 AM - current)
          regularSession: {
            open: regularMarketOpen,
            current: currentPrice,
            change: regularSessionChange,
            changePercent: regularSessionChangePercent
          }
        };
        
      } catch (error) {
        console.error(`Error fetching pre-market data for ${symbol}:`, error.message);
        preMarketData[symbol] = {
          error: error.message,
          hasPreMarketActivity: false
        };
      }
    }
    
    res.json({ preMarketData });
    
  } catch (error) {
    console.error('Error fetching pre-market data:', error.message);
    res.status(500).json({ error: 'Failed to fetch pre-market data' });
  }
});

// The "catchall" handler: send back React's index.html file in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 