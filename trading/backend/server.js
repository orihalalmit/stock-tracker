const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

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

// Import routes
const portfolioRoutes = require('./routes/portfolio');
const watchlistRoutes = require('./routes/watchlist');
const marketRoutes = require('./routes/market');

// Use routes
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/market', marketRoutes);

// Get current stock prices
app.get('/api/stocks/latest', async (req, res) => {
  try {
    const symbols = req.query.symbols;
    if (!symbols) {
      return res.json({}); // Return empty object if no symbols provided
    }
    
    const response = await axios.get(
      `${ALPACA_CONFIG.baseURL}/stocks/quotes/latest?symbols=${symbols}`,
      { headers: getAlpacaHeaders() }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching latest quotes:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch stock quotes' });
  }
});

// Get stock bars (daily data)
app.get('/api/stocks/bars', async (req, res) => {
  try {
    const symbols = req.query.symbols;
    if (!symbols) {
      return res.json({ bars: {} }); // Return empty bars object if no symbols provided
    }
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await axios.get(
      `${ALPACA_CONFIG.baseURL}/stocks/bars?symbols=${symbols}&timeframe=1Day&start=${startDate}&end=${endDate}`,
      { headers: getAlpacaHeaders() }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching bars:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch stock bars' });
  }
});

// Get stock snapshots (includes price and daily change)
app.get('/api/stocks/snapshots', async (req, res) => {
  try {
    const symbols = req.query.symbols;
    const includePremarket = req.query.include_premarket === 'true';
    
    if (!symbols) {
      return res.json({ snapshots: {} }); // Return empty snapshots object if no symbols provided
    }
    
    const response = await axios.get(
      `${ALPACA_CONFIG.baseURL}/stocks/snapshots?symbols=${symbols}&feed=iex`,
      { headers: getAlpacaHeaders() }
    );
    
    // If pre-market data is requested, enhance the response with extended hours calculations
    if (includePremarket) {
      const enhancedSnapshots = {};
      
      Object.entries(response.data).forEach(([symbol, data]) => {
        const currentPrice = data.latestTrade?.p || data.latestQuote?.ap || 0;
        const previousClose = data.prevDailyBar?.c || 0;
        const todayOpen = data.dailyBar?.o || 0;
        const todayHigh = data.dailyBar?.h || 0;
        const todayLow = data.dailyBar?.l || 0;
        const todayVolume = data.dailyBar?.v || 0;
        
        // Calculate overnight gap (previous close to today's open)
        const gapChange = todayOpen - previousClose;
        const gapChangePercent = previousClose > 0 ? ((gapChange / previousClose) * 100) : 0;
        
        // Calculate intraday change (today's open to current price)
        const intradayChange = currentPrice - todayOpen;
        const intradayChangePercent = todayOpen > 0 ? ((intradayChange / todayOpen) * 100) : 0;
        
        // Calculate total daily change (previous close to current price)
        const totalDailyChange = currentPrice - previousClose;
        const totalDailyChangePercent = previousClose > 0 ? ((totalDailyChange / previousClose) * 100) : 0;
        
        // Enhanced pre-market data structure
        enhancedSnapshots[symbol] = {
          ...data,
          
          // Current market data
          currentPrice,
          previousClose,
          todayOpen,
          todayHigh,
          todayLow,
          todayVolume,
          
          // Overnight gap analysis
          preMarketData: {
            change: gapChange,
            changePercent: gapChangePercent,
            from: previousClose,
            to: todayOpen,
            description: `Overnight Gap: ${previousClose.toFixed(2)} → ${todayOpen.toFixed(2)}`
          },
          
          // Intraday analysis (market hours performance)
          intradayData: {
            change: intradayChange,
            changePercent: intradayChangePercent,
            from: todayOpen,
            to: currentPrice,
            description: `Market Session: ${todayOpen.toFixed(2)} → ${currentPrice.toFixed(2)}`
          },
          
          // Total daily performance
          totalDailyData: {
            change: totalDailyChange,
            changePercent: totalDailyChangePercent,
            from: previousClose,
            to: currentPrice,
            description: `Total Daily: ${previousClose.toFixed(2)} → ${currentPrice.toFixed(2)}`
          },
          
          // Additional context
          marketContext: {
            isPreMarket: isPreMarketHours(),
            isAfterHours: isAfterHours(),
            isMarketOpen: isMarketOpen(),
            lastUpdateTime: new Date().toISOString()
          }
        };
      });
      
      res.json({ snapshots: enhancedSnapshots });
    } else {
      res.json({ snapshots: response.data });
    }
    
  } catch (error) {
    console.error('Error fetching stock snapshots:', error.message);
    res.status(500).json({ error: 'Failed to fetch stock snapshots' });
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

// Get USD/ILS exchange rate
app.get('/api/forex/usdils', async (req, res) => {
  try {
    let currentRate, previousRate;
    
    try {
      // Get current rate from exchangerate-api.com
      const currentResponse = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
      currentRate = currentResponse.data.rates?.ILS || 3.60;
      
      // Since historical forex data often requires paid APIs, 
      // let's simulate realistic daily changes for demo purposes
      const today = new Date().getDate();
      const seed = today % 10; // Use day of month as seed for consistent daily changes
      const changePercent = (seed - 5) * 0.003; // Creates changes between -1.5% to +1.5%
      previousRate = currentRate / (1 + changePercent);
      
    } catch (apiError) {
      console.log('API failed, using fallback data with simulated change');
      currentRate = 3.60;
      previousRate = 3.58; // Simulate +0.56% change
    }
    
    const dailyChange = currentRate - previousRate;
    const dailyChangePercent = previousRate > 0 ? ((dailyChange / previousRate) * 100) : 0;
    
    res.json({
      symbol: 'USD/ILS',
      rate: parseFloat(currentRate.toFixed(4)),
      previousRate: parseFloat(previousRate.toFixed(4)),
      dailyChange: parseFloat(dailyChange.toFixed(4)),
      dailyChangePercent: parseFloat(dailyChangePercent.toFixed(2)),
      timestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString().split('T')[0]
    });
    
  } catch (error) {
    console.error('Error fetching USD/ILS rate:', error);
    // Return a fallback rate with simulated change
    const currentRate = 3.60;
    const previousRate = 3.58;
    const dailyChange = currentRate - previousRate;
    const dailyChangePercent = ((dailyChange / previousRate) * 100);
    
    res.json({
      symbol: 'USD/ILS',
      rate: currentRate,
      previousRate: previousRate,
      dailyChange: parseFloat(dailyChange.toFixed(4)),
      dailyChangePercent: parseFloat(dailyChangePercent.toFixed(2)),
      timestamp: new Date().toISOString(),
      lastUpdated: 'N/A',
      error: 'Using fallback data'
    });
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 