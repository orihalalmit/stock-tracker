const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Portfolio = require('./models/Portfolio');

async function exportPortfolios() {
  try {
    // Connect to local MongoDB
    await mongoose.connect('mongodb://admin:password123@localhost:27017/trading?authSource=admin');
    console.log('Connected to local MongoDB');
    
    // Fetch all portfolios
    const portfolios = await Portfolio.find({});
    console.log(`Found ${portfolios.length} portfolios`);
    
    if (portfolios.length === 0) {
      console.log('No portfolios found to export');
      return;
    }
    
    // Create exports directory
    const exportDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }
    
    // Export each portfolio
    for (const portfolio of portfolios) {
      console.log(`Exporting portfolio: ${portfolio.name}`);
      
      if (portfolio.positions.length === 0) {
        console.log(`  - No positions in ${portfolio.name}`);
        continue;
      }
      
      // Create CSV content - format matches the import functionality
      const csvHeader = 'symbol,shares,averagePrice,sector\n';
      const csvRows = portfolio.positions.map(pos => {
        const symbol = pos.symbol || '';
        const shares = pos.shares || 0;
        const averagePrice = pos.averageCost || 0;
        const sector = pos.sector || 'Unknown';
        
        return `${symbol},${shares},${averagePrice},${sector}`;
      }).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      // Write to file
      const filename = `${portfolio.name.replace(/[^a-zA-Z0-9]/g, '_')}_positions.csv`;
      const filepath = path.join(exportDir, filename);
      fs.writeFileSync(filepath, csvContent);
      
      console.log(`  - Exported ${portfolio.positions.length} positions to ${filename}`);
    }
    
    // Also create a summary file
    const summaryContent = portfolios.map(p => ({
      name: p.name,
      positions: p.positions.length,
      totalCostBasis: p.positions.reduce((sum, pos) => sum + (pos.shares * pos.averageCost), 0),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
    
    const summaryCSV = 'Portfolio Name,Positions Count,Total Cost Basis,Created At,Updated At\n' +
      summaryContent.map(p => 
        `"${p.name}",${p.positions},${p.totalCostBasis.toFixed(2)},"${p.createdAt}","${p.updatedAt}"`
      ).join('\n');
    
    fs.writeFileSync(path.join(exportDir, 'portfolios_summary.csv'), summaryCSV);
    console.log('Created portfolios summary file');
    
    console.log(`\nExport completed! Files saved to: ${exportDir}`);
    console.log('Files created:');
    const files = fs.readdirSync(exportDir);
    files.forEach(file => console.log(`  - ${file}`));
    
  } catch (error) {
    console.error('Error exporting portfolios:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

exportPortfolios(); 