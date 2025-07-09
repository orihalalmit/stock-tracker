import React from 'react';
import axios from 'axios';

const TestButton = () => {
  const testAddStock = async () => {
    try {
      console.log('🧪 Testing add stock API...');
      
      // First get the current config
      const configResponse = await axios.get('/api/market/config');
      console.log('Current config:', configResponse.data);
      
      // Find the Individual Stocks section
      const individualStocksSection = configResponse.data.sections.find(
        section => section.name === 'Individual Stocks'
      );
      
      if (!individualStocksSection) {
        console.error('Individual Stocks section not found!');
        return;
      }
      
      console.log('Individual Stocks section ID:', individualStocksSection._id);
      console.log('Current symbols:', individualStocksSection.symbols);
      
      // Try to add a test stock
      const testSymbol = 'TEST' + Math.floor(Math.random() * 1000);
      console.log('Adding test symbol:', testSymbol);
      
      const addResponse = await axios.post(
        `/api/market/config/sections/${individualStocksSection._id}/symbols`,
        { symbol: testSymbol }
      );
      
      console.log('✅ Add stock successful!', addResponse.data);
      alert(`Successfully added ${testSymbol}! Check console for details.`);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      alert('Test failed! Check console for details.');
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      zIndex: 9999,
      background: '#007bff',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      cursor: 'pointer'
    }} onClick={testAddStock}>
      🧪 Test Add Stock API
    </div>
  );
};

export default TestButton; 