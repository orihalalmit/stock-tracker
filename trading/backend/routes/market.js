const express = require('express');
const router = express.Router();
const MarketConfiguration = require('../models/MarketConfiguration');
const { authenticate } = require('../middleware/auth');
const axios = require('axios'); // Added axios for the new endpoint

// Get market configuration (per-user)
router.get('/config', authenticate, async (req, res) => {
  try {
    const config = await MarketConfiguration.getUserConfiguration(req.user._id);
    res.json(config);
  } catch (error) {
    console.error('Error fetching market configuration:', error);
    res.status(500).json({ error: 'Failed to fetch market configuration' });
  }
});

// Update market configuration (per-user)
router.put('/config', authenticate, async (req, res) => {
  try {
    const { sections } = req.body;
    
    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json({ error: 'Invalid sections data' });
    }

    let config = await MarketConfiguration.findOne({ userId: req.user._id });
    if (!config) {
      config = new MarketConfiguration({ userId: req.user._id, sections: [] });
    }

    config.sections = sections;
    await config.save();
    
    res.json(config);
  } catch (error) {
    console.error('Error updating market configuration:', error);
    res.status(500).json({ error: 'Failed to update market configuration' });
  }
});

// Add new market section (per-user)
router.post('/config/sections', authenticate, async (req, res) => {
  try {
    const { name, symbols = [], order } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Section name is required' });
    }

    const config = await MarketConfiguration.getUserConfiguration(req.user._id);
    
    // Determine order if not provided
    const maxOrder = config.sections.reduce((max, section) => Math.max(max, section.order), -1);
    const newOrder = order !== undefined ? order : maxOrder + 1;
    
    config.sections.push({
      name,
      symbols,
      order: newOrder,
      enabled: true
    });

    // Sort sections by order
    config.sections.sort((a, b) => a.order - b.order);
    
    await config.save();
    res.json(config);
  } catch (error) {
    console.error('Error adding market section:', error);
    res.status(500).json({ error: 'Failed to add market section' });
  }
});

// Update a specific market section (per-user)
router.put('/config/sections/:sectionId', authenticate, async (req, res) => {
  try {
    const { name, symbols, order, enabled } = req.body;
    
    const config = await MarketConfiguration.getUserConfiguration(req.user._id);
    const section = config.sections.id(req.params.sectionId);
    
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    if (name !== undefined) section.name = name;
    if (symbols !== undefined) section.symbols = symbols;
    if (order !== undefined) section.order = order;
    if (enabled !== undefined) section.enabled = enabled;
    
    // Sort sections by order
    config.sections.sort((a, b) => a.order - b.order);
    
    await config.save();
    res.json(config);
  } catch (error) {
    console.error('Error updating market section:', error);
    res.status(500).json({ error: 'Failed to update market section' });
  }
});

// Delete a market section (per-user)
router.delete('/config/sections/:sectionId', authenticate, async (req, res) => {
  try {
    const config = await MarketConfiguration.getUserConfiguration(req.user._id);
    const section = config.sections.id(req.params.sectionId);
    
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    config.sections.pull(req.params.sectionId);
    await config.save();
    
    res.json(config);
  } catch (error) {
    console.error('Error deleting market section:', error);
    res.status(500).json({ error: 'Failed to delete market section' });
  }
});

// Add symbol to a market section (per-user)
router.post('/config/sections/:sectionId/symbols', authenticate, async (req, res) => {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const config = await MarketConfiguration.getUserConfiguration(req.user._id);
    const section = config.sections.id(req.params.sectionId);
    
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const upperSymbol = symbol.toUpperCase();
    if (section.symbols.includes(upperSymbol)) {
      return res.status(400).json({ error: 'Symbol already exists in this section' });
    }
    
    section.symbols.push(upperSymbol);
    await config.save();
    
    res.json(config);
  } catch (error) {
    console.error('Error adding symbol to section:', error);
    res.status(500).json({ error: 'Failed to add symbol to section' });
  }
});

// Remove symbol from a market section (per-user)
router.delete('/config/sections/:sectionId/symbols/:symbol', authenticate, async (req, res) => {
  try {
    const config = await MarketConfiguration.getUserConfiguration(req.user._id);
    const section = config.sections.id(req.params.sectionId);
    
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    section.symbols = section.symbols.filter(s => s !== req.params.symbol.toUpperCase());
    await config.save();
    
    res.json(config);
  } catch (error) {
    console.error('Error removing symbol from section:', error);
    res.status(500).json({ error: 'Failed to remove symbol from section' });
  }
});

// Search for stock symbols (new endpoint for better UX)
router.get('/search/:query', authenticate, async (req, res) => {
  try {
    const query = req.params.query.toUpperCase();
    const sectionType = req.query.section_type?.toLowerCase(); // Get section type from query params
    
    let suggestions = [];
    
    if (sectionType === 'currency') {
      // Currency suggestions
      const currencySymbols = [
        { symbol: 'EURUSD=X', name: 'Euro to US Dollar' },
        { symbol: 'GBPUSD=X', name: 'British Pound to US Dollar' },
        { symbol: 'USDJPY=X', name: 'US Dollar to Japanese Yen' },
        { symbol: 'USDCAD=X', name: 'US Dollar to Canadian Dollar' },
        { symbol: 'AUDUSD=X', name: 'Australian Dollar to US Dollar' },
        { symbol: 'NZDUSD=X', name: 'New Zealand Dollar to US Dollar' },
        { symbol: 'USDCHF=X', name: 'US Dollar to Swiss Franc' },
        { symbol: 'USDSEK=X', name: 'US Dollar to Swedish Krona' },
        { symbol: 'USDNOK=X', name: 'US Dollar to Norwegian Krone' },
        { symbol: 'USDDKK=X', name: 'US Dollar to Danish Krone' },
        { symbol: 'DX-Y.NYB', name: 'US Dollar Index' },
        { symbol: 'UUP', name: 'Invesco DB US Dollar Index Bullish Fund' },
        { symbol: 'UDN', name: 'Invesco DB US Dollar Index Bearish Fund' },
        { symbol: 'FXE', name: 'Invesco CurrencyShares Euro Trust' },
        { symbol: 'FXB', name: 'Invesco CurrencyShares British Pound Sterling Trust' },
        { symbol: 'FXY', name: 'Invesco CurrencyShares Japanese Yen Trust' },
        { symbol: 'FXC', name: 'Invesco CurrencyShares Canadian Dollar Trust' },
        { symbol: 'FXA', name: 'Invesco CurrencyShares Australian Dollar Trust' }
      ];
      
      suggestions = currencySymbols.filter(item => 
        item.symbol.includes(query) || 
        item.name.toUpperCase().includes(query) ||
        item.symbol.startsWith(query)
      ).slice(0, 10);
      
    } else if (sectionType === 'crypto' || sectionType === 'bitcoin') {
      // Crypto/Bitcoin suggestions
      const cryptoSymbols = [
        { symbol: 'BTC-USD', name: 'Bitcoin USD' },
        { symbol: 'ETH-USD', name: 'Ethereum USD' },
        { symbol: 'IBIT', name: 'iShares Bitcoin Trust' },
        { symbol: 'ETHE', name: 'Grayscale Ethereum Trust' },
        { symbol: 'ETHW', name: 'Grayscale Ethereum Trust' },
        { symbol: 'COIN', name: 'Coinbase Global Inc.' },
        { symbol: 'MSTR', name: 'MicroStrategy Inc.' },
        { symbol: 'RIOT', name: 'Riot Platforms Inc.' },
        { symbol: 'MARA', name: 'Marathon Digital Holdings Inc.' },
        { symbol: 'CLSK', name: 'CleanSpark Inc.' },
        { symbol: 'BITF', name: 'Bitfarms Ltd.' },
        { symbol: 'HUT', name: 'Hut 8 Mining Corp.' },
        { symbol: 'BTBT', name: 'Bit Digital Inc.' },
        { symbol: 'BITO', name: 'ProShares Bitcoin Strategy ETF' },
        { symbol: 'GBTC', name: 'Grayscale Bitcoin Trust' },
        { symbol: 'ARKB', name: 'ARK 21Shares Bitcoin ETF' },
        { symbol: 'FBTC', name: 'Fidelity Wise Origin Bitcoin Fund' },
        { symbol: 'HODL', name: 'VanEck Bitcoin Trust' }
      ];
      
      suggestions = cryptoSymbols.filter(item => 
        item.symbol.includes(query) || 
        item.name.toUpperCase().includes(query) ||
        item.symbol.startsWith(query)
      ).slice(0, 10);
      
    } else {
      // Stock suggestions (default)
      const stockSymbols = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'MSFT', name: 'Microsoft Corporation' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.' },
        { symbol: 'TSLA', name: 'Tesla Inc.' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation' },
        { symbol: 'META', name: 'Meta Platforms Inc.' },
        { symbol: 'NFLX', name: 'Netflix Inc.' },
        { symbol: 'PLTR', name: 'Palantir Technologies Inc.' },
        { symbol: 'HIMS', name: 'Hims & Hers Health Inc.' },
        { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
        { symbol: 'QQQ', name: 'Invesco QQQ ETF' },
        { symbol: 'IWM', name: 'iShares Russell 2000 ETF' },
        { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' },
        { symbol: 'ARKK', name: 'ARK Innovation ETF' },
        { symbol: 'TQQQ', name: 'ProShares UltraPro QQQ' },
        { symbol: 'SQQQ', name: 'ProShares UltraPro Short QQQ' },
        { symbol: 'MAGS', name: 'Roundhill Magnificent Seven ETF' },
        { symbol: 'RSP', name: 'Invesco S&P 500 Equal Weight ETF' },
        { symbol: 'VXX', name: 'iPath Series B S&P 500 VIX Short-Term Futures ETN' },
        { symbol: 'UVXY', name: 'ProShares Ultra VIX Short-Term Futures ETF' },
        { symbol: 'SVXY', name: 'ProShares Short VIX Short-Term Futures ETF' },
        { symbol: 'VIXY', name: 'ProShares VIX Short-Term Futures ETF' },
        { symbol: 'VIXM', name: 'ProShares VIX Mid-Term Futures ETF' },
        { symbol: 'AMD', name: 'Advanced Micro Devices Inc.' },
        { symbol: 'INTC', name: 'Intel Corporation' },
        { symbol: 'CRM', name: 'Salesforce Inc.' },
        { symbol: 'ORCL', name: 'Oracle Corporation' },
        { symbol: 'ADBE', name: 'Adobe Inc.' },
        { symbol: 'NOW', name: 'ServiceNow Inc.' },
        { symbol: 'SNOW', name: 'Snowflake Inc.' },
        { symbol: 'DDOG', name: 'Datadog Inc.' },
        { symbol: 'ZS', name: 'Zscaler Inc.' },
        { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
        { symbol: 'BAC', name: 'Bank of America Corporation' },
        { symbol: 'WFC', name: 'Wells Fargo & Company' },
        { symbol: 'GS', name: 'Goldman Sachs Group Inc.' },
        { symbol: 'MS', name: 'Morgan Stanley' },
        { symbol: 'SOFI', name: 'SoFi Technologies Inc.' },
        { symbol: 'HOOD', name: 'Robinhood Markets Inc.' },
        { symbol: 'PYPL', name: 'PayPal Holdings Inc.' },
        { symbol: 'SQ', name: 'Block Inc.' },
        { symbol: 'JNJ', name: 'Johnson & Johnson' },
        { symbol: 'PFE', name: 'Pfizer Inc.' },
        { symbol: 'UNH', name: 'UnitedHealth Group Inc.' },
        { symbol: 'ABBV', name: 'AbbVie Inc.' },
        { symbol: 'LLY', name: 'Eli Lilly and Company' },
        { symbol: 'MRNA', name: 'Moderna Inc.' },
        { symbol: 'BNTX', name: 'BioNTech SE' },
        { symbol: 'GILD', name: 'Gilead Sciences Inc.' },
        { symbol: 'REGN', name: 'Regeneron Pharmaceuticals Inc.' },
        { symbol: 'XOM', name: 'Exxon Mobil Corporation' },
        { symbol: 'CVX', name: 'Chevron Corporation' },
        { symbol: 'COP', name: 'ConocoPhillips' },
        { symbol: 'EOG', name: 'EOG Resources Inc.' },
        { symbol: 'SLB', name: 'Schlumberger Limited' },
        { symbol: 'HAL', name: 'Halliburton Company' },
        { symbol: 'OXY', name: 'Occidental Petroleum Corporation' },
        { symbol: 'MPC', name: 'Marathon Petroleum Corporation' },
        { symbol: 'VLO', name: 'Valero Energy Corporation' },
        { symbol: 'COST', name: 'Costco Wholesale Corporation' },
        { symbol: 'WMT', name: 'Walmart Inc.' },
        { symbol: 'HD', name: 'Home Depot Inc.' },
        { symbol: 'LOW', name: 'Lowe\'s Companies Inc.' },
        { symbol: 'TGT', name: 'Target Corporation' },
        { symbol: 'SBUX', name: 'Starbucks Corporation' },
        { symbol: 'MCD', name: 'McDonald\'s Corporation' },
        { symbol: 'NKE', name: 'Nike Inc.' },
        { symbol: 'LULU', name: 'Lululemon Athletica Inc.' },
        { symbol: 'DIS', name: 'Walt Disney Company' },
        { symbol: 'CMCSA', name: 'Comcast Corporation' },
        { symbol: 'T', name: 'AT&T Inc.' },
        { symbol: 'VZ', name: 'Verizon Communications Inc.' },
        { symbol: 'TMUS', name: 'T-Mobile US Inc.' },
        { symbol: 'CHTR', name: 'Charter Communications Inc.' },
        { symbol: 'ROKU', name: 'Roku Inc.' },
        { symbol: 'SPOT', name: 'Spotify Technology S.A.' }
      ];

      suggestions = stockSymbols.filter(item => 
        item.symbol.includes(query) || 
        item.name.toUpperCase().includes(query) ||
        item.symbol.startsWith(query)
      ).slice(0, 10);
    }

    res.json({
      query,
      sectionType: sectionType || 'stock',
      suggestions
    });
  } catch (error) {
    console.error('Error searching symbols:', error);
    res.status(500).json({ error: 'Failed to search symbols' });
  }
});

// Helper function to get company names for common symbols (keeping for backward compatibility)
function getCompanyName(symbol) {
  const companyNames = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'TSLA': 'Tesla Inc.',
    'NVDA': 'NVIDIA Corporation',
    'META': 'Meta Platforms Inc.',
    'NFLX': 'Netflix Inc.',
    'PLTR': 'Palantir Technologies Inc.',
    'HIMS': 'Hims & Hers Health Inc.',
    'SPY': 'SPDR S&P 500 ETF',
    'QQQ': 'Invesco QQQ ETF',
    'IWM': 'iShares Russell 2000 ETF',
    'VTI': 'Vanguard Total Stock Market ETF',
    'ARKK': 'ARK Innovation ETF',
    'TQQQ': 'ProShares UltraPro QQQ',
    'SQQQ': 'ProShares UltraPro Short QQQ',
    'MAGS': 'Roundhill Magnificent Seven ETF',
    'RSP': 'Invesco S&P 500 Equal Weight ETF',
    'VXX': 'iPath Series B S&P 500 VIX Short-Term Futures ETN',
    'UVXY': 'ProShares Ultra VIX Short-Term Futures ETF',
    'SVXY': 'ProShares Short VIX Short-Term Futures ETF',
    'VIXY': 'ProShares VIX Short-Term Futures ETF',
    'VIXM': 'ProShares VIX Mid-Term Futures ETF',
    'IBIT': 'iShares Bitcoin Trust',
    'ETHE': 'Grayscale Ethereum Trust',
    'ETHW': 'Grayscale Ethereum Trust',
    'COIN': 'Coinbase Global Inc.',
    'MSTR': 'MicroStrategy Inc.',
    'AMD': 'Advanced Micro Devices Inc.',
    'INTC': 'Intel Corporation',
    'CRM': 'Salesforce Inc.',
    'ORCL': 'Oracle Corporation',
    'ADBE': 'Adobe Inc.',
    'NOW': 'ServiceNow Inc.',
    'SNOW': 'Snowflake Inc.',
    'DDOG': 'Datadog Inc.',
    'ZS': 'Zscaler Inc.',
    'JPM': 'JPMorgan Chase & Co.',
    'BAC': 'Bank of America Corporation',
    'WFC': 'Wells Fargo & Company',
    'GS': 'Goldman Sachs Group Inc.',
    'MS': 'Morgan Stanley',
    'SOFI': 'SoFi Technologies Inc.',
    'HOOD': 'Robinhood Markets Inc.',
    'PYPL': 'PayPal Holdings Inc.',
    'SQ': 'Block Inc.',
    'JNJ': 'Johnson & Johnson',
    'PFE': 'Pfizer Inc.',
    'UNH': 'UnitedHealth Group Inc.',
    'ABBV': 'AbbVie Inc.',
    'LLY': 'Eli Lilly and Company',
    'MRNA': 'Moderna Inc.',
    'BNTX': 'BioNTech SE',
    'GILD': 'Gilead Sciences Inc.',
    'REGN': 'Regeneron Pharmaceuticals Inc.',
    'XOM': 'Exxon Mobil Corporation',
    'CVX': 'Chevron Corporation',
    'COP': 'ConocoPhillips',
    'EOG': 'EOG Resources Inc.',
    'SLB': 'Schlumberger Limited',
    'HAL': 'Halliburton Company',
    'OXY': 'Occidental Petroleum Corporation',
    'MPC': 'Marathon Petroleum Corporation',
    'VLO': 'Valero Energy Corporation',
    'COST': 'Costco Wholesale Corporation',
    'WMT': 'Walmart Inc.',
    'HD': 'Home Depot Inc.',
    'LOW': 'Lowe\'s Companies Inc.',
    'TGT': 'Target Corporation',
    'SBUX': 'Starbucks Corporation',
    'MCD': 'McDonald\'s Corporation',
    'NKE': 'Nike Inc.',
    'LULU': 'Lululemon Athletica Inc.',
    'DIS': 'Walt Disney Company',
    'CMCSA': 'Comcast Corporation',
    'T': 'AT&T Inc.',
    'VZ': 'Verizon Communications Inc.',
    'TMUS': 'T-Mobile US Inc.',
    'CHTR': 'Charter Communications Inc.',
    'ROKU': 'Roku Inc.',
    'SPOT': 'Spotify Technology S.A.'
  };
  
  return companyNames[symbol] || symbol;
}

// Validate and clean up invalid symbols (per-user)
router.post('/config/validate-symbols', authenticate, async (req, res) => {
  try {
    const config = await MarketConfiguration.findOne({ userId: req.user._id });
    if (!config) {
      return res.status(404).json({ error: 'Market configuration not found' });
    }

    const allSymbols = [];
    const sectionSymbols = new Map();
    
    // Collect all symbols from all sections
    config.sections.forEach(section => {
      if (section.enabled && section.symbols.length > 0) {
        section.symbols.forEach(symbol => {
          allSymbols.push(symbol);
          if (!sectionSymbols.has(symbol)) {
            sectionSymbols.set(symbol, []);
          }
          sectionSymbols.get(symbol).push({
            sectionId: section._id,
            sectionName: section.name
          });
        });
      }
    });

    if (allSymbols.length === 0) {
      return res.json({
        message: 'No symbols to validate',
        validSymbols: [],
        invalidSymbols: [],
        removedSymbols: []
      });
    }

    // Test symbols with the stocks API
    const baseUrl = process.env.NODE_ENV === 'production' ? `http://localhost:${process.env.PORT || 8080}` : 'http://localhost:3001';
    const response = await axios.get(`${baseUrl}/api/stocks/snapshots?symbols=${allSymbols.join(',')}`);
    
    const validSymbols = Object.keys(response.data.snapshots || {});
    const invalidSymbols = [];
    const removedSymbols = [];

    // Find invalid symbols
    if (response.data.errors && response.data.errors.length > 0) {
      response.data.errors.forEach(error => {
        const match = error.match(/Failed to fetch data for ([^:]+):/);
        if (match && match[1]) {
          invalidSymbols.push(match[1]);
        }
      });
    }

    // If auto-remove is requested, remove invalid symbols
    if (req.body.autoRemove === true && invalidSymbols.length > 0) {
      for (const symbol of invalidSymbols) {
        const sections = sectionSymbols.get(symbol) || [];
        for (const section of sections) {
          try {
            // Remove the symbol from the section
            const sectionToUpdate = config.sections.id(section.sectionId);
            if (sectionToUpdate) {
              sectionToUpdate.symbols = sectionToUpdate.symbols.filter(s => s !== symbol);
              removedSymbols.push({
                symbol,
                sectionId: section.sectionId,
                sectionName: section.sectionName
              });
            }
          } catch (err) {
            console.error(`Error removing symbol ${symbol} from section ${section.sectionName}:`, err);
          }
        }
      }

      // Save the updated configuration
      await config.save();
    }

    res.json({
      message: `Validated ${allSymbols.length} symbols. Found ${validSymbols.length} valid and ${invalidSymbols.length} invalid symbols.`,
      totalSymbols: allSymbols.length,
      validSymbols,
      invalidSymbols,
      removedSymbols,
      autoRemoveEnabled: req.body.autoRemove === true
    });

  } catch (error) {
    console.error('Error validating symbols:', error);
    res.status(500).json({ error: 'Failed to validate symbols' });
  }
});

module.exports = router; 