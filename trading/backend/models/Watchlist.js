const mongoose = require('mongoose');

const WatchlistItemSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
});

const WatchlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  items: [WatchlistItemSchema],
  isDefault: {
    type: Boolean,
    default: false
  },
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
WatchlistSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to create default watchlist for new users
WatchlistSchema.statics.createDefaultWatchlist = async function(userId) {
  const defaultWatchlist = new this({
    userId,
    name: 'My Watchlist',
    description: 'Your default watchlist',
    isDefault: true,
    items: [
      {
        symbol: 'AAPL',
        notes: 'Apple Inc.'
      },
      {
        symbol: 'GOOGL',
        notes: 'Alphabet Inc.'
      },
      {
        symbol: 'MSFT',
        notes: 'Microsoft Corporation'
      },
      {
        symbol: 'TSLA',
        notes: 'Tesla Inc.'
      },
      {
        symbol: 'NVDA',
        notes: 'NVIDIA Corporation'
      }
    ]
  });

  await defaultWatchlist.save();
  return defaultWatchlist;
};

module.exports = mongoose.model('Watchlist', WatchlistSchema); 