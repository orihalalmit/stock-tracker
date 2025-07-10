const express = require('express');
const router = express.Router();
const Watchlist = require('../models/Watchlist');
const axios = require('axios');

// Get all watchlists
router.get('/', async (req, res) => {
  try {
    const watchlists = await Watchlist.find().sort({ createdAt: -1 });
    res.json(watchlists);
  } catch (error) {
    console.error('Error fetching watchlists:', error);
    res.status(500).json({ error: 'Failed to fetch watchlists' });
  }
});

// Get a specific watchlist with market data
router.get('/:id', async (req, res) => {
  try {
    const watchlist = await Watchlist.findById(req.params.id);
    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    // If no items, return basic watchlist data
    if (!watchlist.items || watchlist.items.length === 0) {
      return res.json({
        ...watchlist.toObject(),
        stockData: []
      });
    }

    // Get symbols from watchlist items
    const symbols = watchlist.items.map(item => item.symbol).join(',');
    const includePremarket = req.query.include_premarket === 'true';
    
    // Fetch current market data with optional pre-market data
    const baseUrl = process.env.NODE_ENV === 'production' ? `http://localhost:${process.env.PORT || 8080}` : 'http://localhost:3001';
    const snapshotsUrl = `${baseUrl}/api/stocks/snapshots?symbols=${symbols}${includePremarket ? '&include_premarket=true' : ''}`;
    const snapshotsResponse = await axios.get(snapshotsUrl);
    const snapshots = snapshotsResponse.data.snapshots || {};

    // Enrich watchlist items with market data
    const enrichedItems = watchlist.items.map(item => {
      const snapshot = snapshots[item.symbol] || {};
      const currentPrice = snapshot.latestTrade?.p || snapshot.latestQuote?.ap || 0;
      const previousClose = snapshot.prevDailyBar?.c || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? ((change / previousClose) * 100) : 0;

      const enrichedItem = {
        ...item.toObject(),
        currentPrice,
        previousClose,
        change,
        changePercent,
        volume: snapshot.dailyBar?.v || 0,
        high: snapshot.dailyBar?.h || 0,
        low: snapshot.dailyBar?.l || 0,
        open: snapshot.dailyBar?.o || previousClose
      };

      // Add pre-market data if available
      if (includePremarket && snapshot.preMarketData) {
        enrichedItem.preMarketData = {
          change: snapshot.preMarketData.change,
          changePercent: snapshot.preMarketData.changePercent,
          openPrice: snapshot.preMarketData.openPrice,
          previousClose: snapshot.preMarketData.previousClose
        };
        enrichedItem.intradayData = {
          change: snapshot.intradayData.change,
          changePercent: snapshot.intradayData.changePercent,
          fromOpen: snapshot.intradayData.fromOpen
        };
      }

      return enrichedItem;
    });

    res.json({
      ...watchlist.toObject(),
      stockData: enrichedItems
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// Create a new watchlist
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Watchlist name is required' });
    }

    const watchlist = new Watchlist({
      name,
      description,
      items: []
    });

    await watchlist.save();
    res.status(201).json(watchlist);
  } catch (error) {
    console.error('Error creating watchlist:', error);
    res.status(500).json({ error: 'Failed to create watchlist' });
  }
});

// Update watchlist details
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const watchlist = await Watchlist.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );

    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    res.json(watchlist);
  } catch (error) {
    console.error('Error updating watchlist:', error);
    res.status(500).json({ error: 'Failed to update watchlist' });
  }
});

// Delete a watchlist
router.delete('/:id', async (req, res) => {
  try {
    const watchlist = await Watchlist.findByIdAndDelete(req.params.id);
    
    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    res.json({ message: 'Watchlist deleted successfully' });
  } catch (error) {
    console.error('Error deleting watchlist:', error);
    res.status(500).json({ error: 'Failed to delete watchlist' });
  }
});

// Add stock to watchlist
router.post('/:id/items', async (req, res) => {
  try {
    const { symbol, notes } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }

    const watchlist = await Watchlist.findById(req.params.id);
    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    // Check if symbol already exists in watchlist
    const existingItem = watchlist.items.find(item => item.symbol === symbol.toUpperCase());
    if (existingItem) {
      return res.status(400).json({ error: 'Stock already exists in watchlist' });
    }

    // Add new item
    watchlist.items.push({
      symbol: symbol.toUpperCase(),
      notes: notes || ''
    });

    await watchlist.save();
    res.json(watchlist);
  } catch (error) {
    console.error('Error adding item to watchlist:', error);
    res.status(500).json({ error: 'Failed to add item to watchlist' });
  }
});

// Remove stock from watchlist
router.delete('/:id/items/:symbol', async (req, res) => {
  try {
    const watchlist = await Watchlist.findById(req.params.id);
    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    // Remove item with matching symbol
    watchlist.items = watchlist.items.filter(item => item.symbol !== req.params.symbol.toUpperCase());
    
    await watchlist.save();
    res.json(watchlist);
  } catch (error) {
    console.error('Error removing item from watchlist:', error);
    res.status(500).json({ error: 'Failed to remove item from watchlist' });
  }
});

// Update notes for a watchlist item
router.put('/:id/items/:symbol', async (req, res) => {
  try {
    const { notes } = req.body;
    
    const watchlist = await Watchlist.findById(req.params.id);
    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    // Find and update the item
    const item = watchlist.items.find(item => item.symbol === req.params.symbol.toUpperCase());
    if (!item) {
      return res.status(404).json({ error: 'Stock not found in watchlist' });
    }

    item.notes = notes || '';
    await watchlist.save();
    
    res.json(watchlist);
  } catch (error) {
    console.error('Error updating watchlist item:', error);
    res.status(500).json({ error: 'Failed to update watchlist item' });
  }
});

module.exports = router; 