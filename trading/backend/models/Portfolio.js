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
    required: true,
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
  if (isNaN(this.averageCost)) this.averageCost = 0;
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

// Update the updatedAt timestamp before saving
PortfolioSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Clean positions array
  this.positions = this.positions.filter(pos => 
    pos.symbol && 
    !isNaN(pos.shares) && 
    !isNaN(pos.averageCost) && 
    pos.shares > 0
  );
  
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