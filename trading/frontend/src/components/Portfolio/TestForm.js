import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../Auth/AuthContext';

const TestForm = () => {
  const [formData, setFormData] = useState({
    symbol: 'AAPL',
    shares: '10',
    averagePrice: '150.00',
    sector: 'Technology'
  });
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { token, user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResult('');

    try {
      console.log('🧪 Test form submission starting...');
      console.log('User:', user);
      console.log('Token exists:', !!token);
      console.log('Form data:', formData);

      // Get portfolios first
      const portfoliosResponse = await axios.get('/api/portfolio');
      console.log('📁 Portfolios:', portfoliosResponse.data);

      if (portfoliosResponse.data.length === 0) {
        setResult('❌ No portfolios found. Create a portfolio first.');
        return;
      }

      const portfolioId = portfoliosResponse.data[0]._id;
      console.log('📊 Using portfolio ID:', portfolioId);

      // Try to add position
      const response = await axios.post(
        `/api/portfolio/${portfolioId}/positions`,
        {
          symbol: formData.symbol.toUpperCase(),
          shares: parseFloat(formData.shares),
          averagePrice: parseFloat(formData.averagePrice),
          sector: formData.sector
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('✅ Success response:', response.data);
      setResult(`✅ Position added successfully! Response: ${JSON.stringify(response.data, null, 2)}`);

    } catch (error) {
      console.error('❌ Test form error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      setResult(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '20px', 
      borderRadius: '8px',
      zIndex: 9999,
      maxWidth: '400px'
    }}>
      <h3>🧪 Test Position Form</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>Symbol:</label>
          <input
            type="text"
            name="symbol"
            value={formData.symbol}
            onChange={handleChange}
            style={{ width: '100%', padding: '5px', marginLeft: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Shares:</label>
          <input
            type="number"
            name="shares"
            value={formData.shares}
            onChange={handleChange}
            style={{ width: '100%', padding: '5px', marginLeft: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Price:</label>
          <input
            type="number"
            name="averagePrice"
            value={formData.averagePrice}
            onChange={handleChange}
            step="0.01"
            style={{ width: '100%', padding: '5px', marginLeft: '5px' }}
          />
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          style={{ 
            background: '#10b981', 
            color: 'white', 
            border: 'none', 
            padding: '10px 20px', 
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Testing...' : 'Test Submit'}
        </button>
      </form>
      
      {result && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'pre-wrap'
        }}>
          {result}
        </div>
      )}
    </div>
  );
};

export default TestForm;
