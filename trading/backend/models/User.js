const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
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

// Hash password before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update the updatedAt timestamp before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance method to check password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get user info without password
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Instance method to create default watchlist for new users
UserSchema.methods.createDefaultWatchlist = async function() {
  const Watchlist = require('./Watchlist');
  
  // Check if user already has watchlists
  const existingWatchlists = await Watchlist.find({ userId: this._id });
  if (existingWatchlists.length > 0) {
    return null; // User already has watchlists
  }

  try {
    const defaultWatchlist = await Watchlist.createDefaultWatchlist(this._id);
    console.log(`✅ Created default watchlist for user: ${this.username}`);
    return defaultWatchlist;
  } catch (error) {
    console.error(`❌ Failed to create default watchlist for user ${this.username}:`, error);
    return null;
  }
};

// Instance method to create sample portfolio for new users
UserSchema.methods.createSamplePortfolio = async function() {
  const Portfolio = require('./Portfolio');
  
  // Check if user already has portfolios
  const existingPortfolios = await Portfolio.find({ userId: this._id });
  if (existingPortfolios.length > 0) {
    return null; // User already has portfolios
  }

  // Sample positions based on your portfolio with varied quantities
  const samplePositions = [
    {
      symbol: 'AAPL',
      shares: 15,
      averageCost: 185.50,
      sector: 'Technology',
      purchaseDate: new Date('2024-01-15')
    },
    {
      symbol: 'NVDA',
      shares: 25,
      averageCost: 95.30,
      sector: 'Technology',
      purchaseDate: new Date('2024-02-01')
    },
    {
      symbol: 'MSFT',
      shares: 12,
      averageCost: 375.25,
      sector: 'Technology',
      purchaseDate: new Date('2024-01-20')
    },
    {
      symbol: 'GOOGL',
      shares: 8,
      averageCost: 165.75,
      sector: 'Technology',
      purchaseDate: new Date('2024-02-10')
    },
    {
      symbol: 'META',
      shares: 10,
      averageCost: 485.60,
      sector: 'Technology',
      purchaseDate: new Date('2024-01-25')
    },
    {
      symbol: 'AMZN',
      shares: 18,
      averageCost: 155.80,
      sector: 'Consumer Discretionary',
      purchaseDate: new Date('2024-02-05')
    },
    {
      symbol: 'PLTR',
      shares: 75,
      averageCost: 22.45,
      sector: 'Technology',
      purchaseDate: new Date('2024-01-30')
    },
    {
      symbol: 'AMD',
      shares: 30,
      averageCost: 145.20,
      sector: 'Technology',
      purchaseDate: new Date('2024-02-15')
    },
    {
      symbol: 'QQQ',
      shares: 5,
      averageCost: 425.80,
      sector: 'ETF',
      purchaseDate: new Date('2024-01-10')
    },
    {
      symbol: 'SOFI',
      shares: 200,
      averageCost: 8.75,
      sector: 'Financial Services',
      purchaseDate: new Date('2024-02-20')
    }
  ];

  try {
    const samplePortfolio = new Portfolio({
      name: '🚀 My Sample Portfolio',
      description: 'A diversified tech-focused portfolio to get you started! Feel free to modify or delete this portfolio and create your own.',
      userId: this._id,
      positions: samplePositions,
      cash: 2500.00, // Starting cash
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await samplePortfolio.save();
    console.log(`✅ Created sample portfolio for user: ${this.username}`);
    return samplePortfolio;
  } catch (error) {
    console.error(`❌ Failed to create sample portfolio for user ${this.username}:`, error);
    return null;
  }
};

// Static method to create admin user if it doesn't exist
UserSchema.statics.createAdminUser = async function() {
  const adminExists = await this.findOne({ role: 'admin' });
  
  if (!adminExists) {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@trading.app';
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      console.warn('⚠️  ADMIN_PASSWORD environment variable is not set. Admin user will not be created.');
      console.warn('⚠️  Please set ADMIN_PASSWORD in your environment variables to create an admin user.');
      return null;
    }
    
    const adminUser = new this({
      username: adminUsername,
      email: adminEmail,
      password: adminPassword, // This will be hashed by the pre-save hook
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User'
    });
    
    await adminUser.save();
    console.log(`✅ Admin user created successfully: username=${adminUsername}`);
    console.log('🔒 Admin password is securely stored and hashed.');
    return adminUser;
  }
  
  return adminExists;
};

module.exports = mongoose.model('User', UserSchema); 