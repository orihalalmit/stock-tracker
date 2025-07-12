const mongoose = require('mongoose');

const MarketSectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  symbols: [{
    type: String,
    uppercase: true,
    trim: true
  }],
  order: {
    type: Number,
    default: 0
  },
  enabled: {
    type: Boolean,
    default: true
  }
});

const MarketConfigurationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sections: [MarketSectionSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
MarketConfigurationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get or create user-specific configuration
MarketConfigurationSchema.statics.getUserConfiguration = async function(userId) {
  let config = await this.findOne({ userId });
  
  if (!config) {
    // Create default configuration for the user
    config = new this({
      userId,
      sections: [
        {
          name: 'Currency',
          symbols: [], // Special section for currency data
          order: 0,
          enabled: true
        },
        {
          name: 'Major Indices & ETFs',
          symbols: ['SPY', 'QQQ', 'IWM', 'RSP', 'MAGS'],
          order: 1,
          enabled: true
        },
        {
          name: 'Volatility ETFs',
          symbols: ['VXX', 'UVXY', 'SVXY'],
          order: 2,
          enabled: true
        },
        {
          name: 'Individual Stocks',
          symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'PLTR', 'HIMS'],
          order: 3,
          enabled: true
        },
        {
          name: 'Bitcoin & Ethereum',
          symbols: ['IBIT', 'ETHE', 'ETHW'], // Special section that includes Bitcoin data
          order: 4,
          enabled: true
        }
      ]
    });
    await config.save();
  }
  
  return config;
};

// Static method to get or create default configuration (for backward compatibility)
MarketConfigurationSchema.statics.getDefaultConfiguration = async function() {
  let config = await this.findOne({ userId: 'default' });
  
  if (!config) {
    // Create default configuration with the current hardcoded sections
    config = new this({
      userId: 'default',
      sections: [
        {
          name: 'Currency',
          symbols: [], // Special section for currency data
          order: 0,
          enabled: true
        },
        {
          name: 'Major Indices & ETFs',
          symbols: ['SPY', 'QQQ', 'IWM', 'RSP', 'MAGS'],
          order: 1,
          enabled: true
        },
        {
          name: 'Volatility ETFs',
          symbols: ['VXX', 'UVXY', 'SVXY'],
          order: 2,
          enabled: true
        },
        {
          name: 'Individual Stocks',
          symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'PLTR', 'HIMS'],
          order: 3,
          enabled: true
        },
        {
          name: 'Bitcoin & Ethereum',
          symbols: ['IBIT', 'ETHE', 'ETHW'], // Special section that includes Bitcoin data
          order: 4,
          enabled: true
        }
      ]
    });
    await config.save();
  }
  
  return config;
};

module.exports = mongoose.model('MarketConfiguration', MarketConfigurationSchema); 