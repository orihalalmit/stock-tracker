const mongoose = require('mongoose');

const PositionSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
  },
  shares: {
    type: Number,
    required: true,
    min: 0,
    set: v => Math.max(0, Number(v) || 0), // Convert to number and ensure non-negative
  },
  averageCost: {
    type: Number,
    min: 0,
    set: v => Math.max(0, Number(v) || 0), // Convert to number and ensure non-negative
  },
  averagePrice: {
    type: Number,
    min: 0,
    set: v => Math.max(0, Number(v) || 0), // Convert to number and ensure non-negative
  },
  sector: {
    type: String,
    default: 'Unknown',
    trim: true,
  },
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

// Add middleware to clean data before saving
PositionSchema.pre('save', function(next) {
  // Ensure numeric fields are valid numbers
  if (isNaN(this.shares)) this.shares = 0;
  
  // Handle both averageCost and averagePrice for backward compatibility
  // Normalize to use averageCost as the primary field
  if (this.averagePrice && !this.averageCost) {
    this.averageCost = this.averagePrice;
  } else if (this.averageCost && !this.averagePrice) {
    this.averagePrice = this.averageCost;
  }
  
  // Ensure at least one price field is valid
  if (isNaN(this.averageCost) && isNaN(this.averagePrice)) {
    this.averageCost = 0;
    this.averagePrice = 0;
  } else {
    // Ensure both are set to the same value
    const price = this.averageCost || this.averagePrice || 0;
    this.averageCost = price;
    this.averagePrice = price;
  }
  
  this.lastUpdated = new Date();
  next();
});

const PortfolioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  positions: [PositionSchema],
  cash: {
    type: Number,
    default: 0,
    min: 0,
    set: v => Math.max(0, Number(v) || 0), // Convert to number and ensure non-negative
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Normalize positions after loading from database
PortfolioSchema.post('init', function() {
  // Normalize all positions to ensure both averageCost and averagePrice are set
  if (this.positions) {
    this.positions.forEach(pos => {
      if (pos.averagePrice && !pos.averageCost) {
        pos.averageCost = pos.averagePrice;
      } else if (pos.averageCost && !pos.averagePrice) {
        pos.averagePrice = pos.averageCost;
      }
    });
  }
});

// Update the updatedAt timestamp before saving
PortfolioSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Clean positions array - handle both averageCost and averagePrice
  this.positions = this.positions.filter(pos => {
    const hasValidSymbol = pos.symbol;
    const hasValidShares = !isNaN(pos.shares) && pos.shares > 0;
    const hasValidPrice = (!isNaN(pos.averageCost) && pos.averageCost > 0) || 
                          (!isNaN(pos.averagePrice) && pos.averagePrice > 0);
    return hasValidSymbol && hasValidShares && hasValidPrice;
  });
  
  next();
});

// Calculate total value (requires current market prices)
PortfolioSchema.methods.calculateValue = async function(marketPrices) {
  let totalValue = this.cash || 0;
  
  for (const position of this.positions) {
    const currentPrice = marketPrices[position.symbol];
    if (currentPrice && !isNaN(currentPrice) && !isNaN(position.shares)) {
      totalValue += position.shares * currentPrice;
    }
  }
  
  return Math.max(0, totalValue);
};

// Calculate total gain/loss (requires current market prices)
PortfolioSchema.methods.calculateGainLoss = async function(marketPrices) {
  let totalGainLoss = 0;
  
  for (const position of this.positions) {
    const currentPrice = marketPrices[position.symbol];
    if (currentPrice && !isNaN(currentPrice) && !isNaN(position.shares) && !isNaN(position.averageCost)) {
      const costBasis = position.shares * position.averageCost;
      const currentValue = position.shares * currentPrice;
      totalGainLoss += currentValue - costBasis;
    }
  }
  
  return totalGainLoss;
};

module.exports = mongoose.model('Portfolio', PortfolioSchema); 