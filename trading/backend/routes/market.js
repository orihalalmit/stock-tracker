const express = require('express');
const router = express.Router();
const MarketConfiguration = require('../models/MarketConfiguration');
const axios = require('axios'); // Added axios for the new endpoint

// Get market configuration
router.get('/config', async (req, res) => {
  try {
    const config = await MarketConfiguration.getDefaultConfiguration();
    res.json(config);
  } catch (error) {
    console.error('Error fetching market configuration:', error);
    res.status(500).json({ error: 'Failed to fetch market configuration' });
  }
});

// Update market configuration
router.put('/config', async (req, res) => {
  try {
    const { sections } = req.body;
    
    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json({ error: 'Invalid sections data' });
    }

    let config = await MarketConfiguration.findOne({ userId: 'default' });
    if (!config) {
      config = new MarketConfiguration({ userId: 'default', sections: [] });
    }

    config.sections = sections;
    await config.save();
    
    res.json(config);
  } catch (error) {
    console.error('Error updating market configuration:', error);
    res.status(500).json({ error: 'Failed to update market configuration' });
  }
});

// Add new market section
router.post('/config/sections', async (req, res) => {
  try {
    const { name, symbols = [], order } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Section name is required' });
    }

    const config = await MarketConfiguration.getDefaultConfiguration();
    
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

// Update a specific market section
router.put('/config/sections/:sectionId', async (req, res) => {
  try {
    const { name, symbols, order, enabled } = req.body;
    
    const config = await MarketConfiguration.getDefaultConfiguration();
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

// Delete a market section
router.delete('/config/sections/:sectionId', async (req, res) => {
  try {
    const config = await MarketConfiguration.getDefaultConfiguration();
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

// Add symbol to a market section
router.post('/config/sections/:sectionId/symbols', async (req, res) => {
  try {
    const { symbol } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const config = await MarketConfiguration.getDefaultConfiguration();
    const section = config.sections.id(req.params.sectionId);
    
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const upperSymbol = symbol.toUpperCase();
    if (!section.symbols.includes(upperSymbol)) {
      section.symbols.push(upperSymbol);
      await config.save();
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error adding symbol to section:', error);
    res.status(500).json({ error: 'Failed to add symbol to section' });
  }
});

// Remove symbol from a market section
router.delete('/config/sections/:sectionId/symbols/:symbol', async (req, res) => {
  try {
    const config = await MarketConfiguration.getDefaultConfiguration();
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

// Validate and clean up invalid symbols
router.post('/config/validate-symbols', async (req, res) => {
  try {
    const config = await MarketConfiguration.findOne({ userId: 'default' });
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