const express = require('express');
const router = express.Router();
const MarketConfiguration = require('../models/MarketConfiguration');

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

module.exports = router; 