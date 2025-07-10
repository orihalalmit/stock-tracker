const mongoose = require('mongoose');
const Portfolio = require('./models/Portfolio');

async function inspectData() {
  try {
    await mongoose.connect('mongodb://admin:password123@localhost:27017/trading?authSource=admin');
    console.log('Connected to local MongoDB');
    
    const portfolios = await Portfolio.find({});
    
    for (const portfolio of portfolios) {
      console.log(`\nPortfolio: ${portfolio.name}`);
      console.log('Sample positions:');
      
      portfolio.positions.slice(0, 3).forEach((pos, i) => {
        console.log(`Position ${i+1}:`);
        console.log('  Symbol:', pos.symbol);
        console.log('  Shares:', pos.shares);
        console.log('  Cost Per Share:', pos.costPerShare);
        console.log('  Purchase Price:', pos.purchasePrice);
        console.log('  Average Cost:', pos.averageCost);
        console.log('  Total Cost:', pos.totalCost);
        console.log('  Raw object:', JSON.stringify(pos.toObject(), null, 2));
        console.log('---');
      });
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

inspectData(); 