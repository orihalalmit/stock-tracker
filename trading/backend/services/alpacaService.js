const axios = require('axios');
const RateLimiter = require('./rateLimiter');
const CacheService = require('./cacheService');

class AlpacaService {
  constructor() {
    this.config = {
      apiKey: process.env.ALPACA_API_KEY,
      secretKey: process.env.ALPACA_SECRET_KEY,
      baseURL: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets/v2'
    };
    
    this.rateLimiter = new RateLimiter(180, 60000); // Conservative 180 requests per minute
    this.cache = new CacheService();
    
    // Clean up cache every 5 minutes
    setInterval(() => {
      this.cache.cleanup();
    }, 5 * 60 * 1000);
  }

  getHeaders() {
    return {
      'APCA-API-KEY-ID': this.config.apiKey,
      'APCA-API-SECRET-KEY': this.config.secretKey,
      'User-Agent': 'Trading-App/1.0'
    };
  }

  async makeRequest(url, priority = 0) {
    return this.rateLimiter.makeRequest(async () => {
      const response = await axios.get(url, { 
        headers: this.getHeaders(),
        timeout: 10000 // 10 second timeout
      });
      return response.data;
    }, priority);
  }

  async getSnapshots(symbols, includePremarket = false) {
    if (!symbols || symbols.length === 0) {
      return { snapshots: {}, errors: [], warnings: [] };
    }

    const symbolsArray = Array.isArray(symbols) ? symbols : symbols.split(',').map(s => s.trim().toUpperCase());
    const cacheKey = this.cache.getSnapshotsKey(symbolsArray);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for ${symbolsArray.length} symbols`);
      return cached;
    }

    const validSnapshots = {};
    const errors = [];
    const warnings = [];

    try {
      // Try bulk request first with smaller batches to avoid rate limits
      const batchSize = 50; // Smaller batch size to reduce load
      const batches = [];
      
      for (let i = 0; i < symbolsArray.length; i += batchSize) {
        batches.push(symbolsArray.slice(i, i + batchSize));
      }

      console.log(`Processing ${symbolsArray.length} symbols in ${batches.length} batches`);

      for (const batch of batches) {
        try {
          const url = `${this.config.baseURL}/stocks/snapshots?symbols=${batch.join(',')}&feed=iex`;
          const data = await this.makeRequest(url, 1); // High priority for bulk requests
          
          // Merge results
          Object.assign(validSnapshots, data);
          
          // Add small delay between batches
          if (batches.length > 1) {
            await this.sleep(200);
          }
          
        } catch (error) {
          console.warn(`Batch request failed for ${batch.length} symbols, trying individual requests:`, error.message);
          
          // If batch fails, try individual requests with lower priority and delays
          const individualResults = await this.getIndividualSnapshots(batch);
          Object.assign(validSnapshots, individualResults.snapshots);
          errors.push(...individualResults.errors);
          warnings.push(...individualResults.warnings);
        }
      }

      // Process snapshots for pre-market data if requested
      const processedSnapshots = includePremarket ? 
        this.processPremarketData(validSnapshots) : validSnapshots;

      // Check for missing symbols
      const receivedSymbols = Object.keys(processedSnapshots);
      const missingSymbols = symbolsArray.filter(symbol => !receivedSymbols.includes(symbol));
      
      if (missingSymbols.length > 0) {
        warnings.push(`No data available for symbols: ${missingSymbols.join(', ')}`);
      }

      const result = {
        snapshots: processedSnapshots,
        errors,
        warnings,
        requestedSymbols: symbolsArray.length,
        returnedSymbols: receivedSymbols.length,
        cached: false
      };

      // Cache the result
      this.cache.set(cacheKey, result, 30000); // 30 second cache

      return result;

    } catch (error) {
      console.error('Error in getSnapshots:', error.message);
      return {
        snapshots: {},
        errors: [error.message],
        warnings: [],
        requestedSymbols: symbolsArray.length,
        returnedSymbols: 0,
        cached: false
      };
    }
  }

  async getIndividualSnapshots(symbols) {
    const snapshots = {};
    const errors = [];
    const warnings = [];

    // Process symbols individually with delays to avoid rate limits
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      
      try {
        const url = `${this.config.baseURL}/stocks/snapshots?symbols=${symbol}&feed=iex`;
        const data = await this.makeRequest(url, 0); // Lower priority for individual requests
        
        if (data[symbol]) {
          snapshots[symbol] = data[symbol];
        } else {
          warnings.push(`No data available for symbol: ${symbol}`);
        }
        
        // Add delay between individual requests
        if (i < symbols.length - 1) {
          await this.sleep(300); // 300ms delay between individual requests
        }
        
      } catch (error) {
        errors.push(`Failed to fetch data for ${symbol}: ${error.message}`);
      }
    }

    return { snapshots, errors, warnings };
  }

  async getBars(symbols, timeframe = '1Day', start, end) {
    if (!symbols || symbols.length === 0) {
      return { bars: {} };
    }

    const symbolsArray = Array.isArray(symbols) ? symbols : symbols.split(',').map(s => s.trim().toUpperCase());
    const cacheKey = this.cache.getBarsKey(symbolsArray, timeframe, start, end);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for bars: ${symbolsArray.length} symbols`);
      return cached;
    }

    try {
      const url = `${this.config.baseURL}/stocks/bars?symbols=${symbolsArray.join(',')}&timeframe=${timeframe}&start=${start}&end=${end}`;
      const data = await this.makeRequest(url, 1);
      
      // Cache the result
      this.cache.set(cacheKey, data, 60000); // 1 minute cache for bars
      
      return data;
    } catch (error) {
      console.error('Error fetching bars:', error.message);
      return { bars: {} };
    }
  }

  async getQuotes(symbols) {
    if (!symbols || symbols.length === 0) {
      return {};
    }

    const symbolsArray = Array.isArray(symbols) ? symbols : symbols.split(',').map(s => s.trim().toUpperCase());
    
    try {
      const url = `${this.config.baseURL}/stocks/quotes/latest?symbols=${symbolsArray.join(',')}`;
      const data = await this.makeRequest(url, 1);
      return data;
    } catch (error) {
      console.error('Error fetching quotes:', error.message);
      return {};
    }
  }

  processPremarketData(snapshots) {
    const enhanced = {};
    
    Object.entries(snapshots).forEach(([symbol, data]) => {
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
      
      enhanced[symbol] = {
        ...data,
        currentPrice,
        previousClose,
        todayOpen,
        todayHigh,
        todayLow,
        todayVolume,
        preMarketData: {
          change: gapChange,
          changePercent: gapChangePercent,
          from: previousClose,
          to: todayOpen,
          description: `Overnight Gap: ${previousClose.toFixed(2)} → ${todayOpen.toFixed(2)}`
        },
        intradayData: {
          change: intradayChange,
          changePercent: intradayChangePercent,
          from: todayOpen,
          to: currentPrice,
          description: `Market Session: ${todayOpen.toFixed(2)} → ${currentPrice.toFixed(2)}`
        },
        totalDailyData: {
          change: totalDailyChange,
          changePercent: totalDailyChangePercent,
          from: previousClose,
          to: currentPrice,
          description: `Total Daily: ${previousClose.toFixed(2)} → ${currentPrice.toFixed(2)}`
        },
        marketContext: {
          isPreMarket: this.isPreMarketHours(),
          isAfterHours: this.isAfterHours(),
          isMarketOpen: this.isMarketOpen(),
          lastUpdateTime: new Date().toISOString()
        }
      };
    });
    
    return enhanced;
  }

  isPreMarketHours() {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = easternTime.getHours();
    const day = easternTime.getDay();
    
    const isWeekday = day >= 1 && day <= 5;
    const isPreMarketTime = hour >= 4 && hour < 9.5;
    
    return isWeekday && isPreMarketTime;
  }

  isAfterHours() {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = easternTime.getHours();
    const day = easternTime.getDay();
    
    const isWeekday = day >= 1 && day <= 5;
    const isAfterHoursTime = hour >= 16 && hour < 20;
    
    return isWeekday && isAfterHoursTime;
  }

  isMarketOpen() {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = easternTime.getHours();
    const minute = easternTime.getMinutes();
    const day = easternTime.getDay();
    
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = (hour > 9 || (hour === 9 && minute >= 30)) && hour < 16;
    
    return isWeekday && isMarketHours;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      rateLimiter: {
        queueLength: this.rateLimiter.getQueueLength(),
        requestCount: this.rateLimiter.getRequestCount()
      },
      cache: this.cache.getStats()
    };
  }
}

module.exports = AlpacaService; 