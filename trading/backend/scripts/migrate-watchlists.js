const mongoose = require('mongoose');
const User = require('../models/User');
const Watchlist = require('../models/Watchlist');

// Load environment variables
require('dotenv').config();

async function migrateWatchlists() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/trading?authSource=admin';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all watchlists without userId
    const watchlistsWithoutUserId = await Watchlist.find({ userId: { $exists: false } });
    console.log(`Found ${watchlistsWithoutUserId.length} watchlists without userId`);

    if (watchlistsWithoutUserId.length === 0) {
      console.log('No watchlists need migration');
      return;
    }

    // Find the first admin user to assign these watchlists to
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('No admin user found, creating one...');
      adminUser = new User({
        username: 'admin',
        email: 'admin@trading.app',
        password: 'admin123', // This will be hashed
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User'
      });
      await adminUser.save();
      console.log('Created admin user');
    }

    // Update all watchlists without userId to belong to the admin user
    const result = await Watchlist.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: adminUser._id } }
    );

    console.log(`Updated ${result.modifiedCount} watchlists with userId: ${adminUser._id}`);
    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  migrateWatchlists();
}

module.exports = migrateWatchlists; 