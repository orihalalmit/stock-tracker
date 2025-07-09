const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  portfolioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: true
  },
  type: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  shares: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  total: {
    type: Number,
    required: true
  }
});

// Calculate transaction total before saving
TransactionSchema.pre('save', function(next) {
  this.total = this.shares * this.price;
  next();
});

module.exports = mongoose.model('Transaction', TransactionSchema); 