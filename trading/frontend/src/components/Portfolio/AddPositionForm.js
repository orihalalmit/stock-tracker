import React, { useState } from 'react';
import './AddPositionForm.css';

const SECTORS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Cyclical',
  'Consumer Defensive',
  'Industrials',
  'Energy',
  'Basic Materials',
  'Communication Services',
  'Real Estate',
  'Utilities'
];

const AddPositionForm = ({ onSubmit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    shares: '',
    averagePrice: '',
    sector: 'Technology'
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!formData.symbol) {
      setError('Symbol is required');
      return;
    }
    if (!formData.shares || formData.shares <= 0) {
      setError('Shares must be greater than 0');
      return;
    }
    if (!formData.averagePrice || formData.averagePrice <= 0) {
      setError('Average price must be greater than 0');
      return;
    }

    // Submit form
    onSubmit({
      ...formData,
      symbol: formData.symbol.toUpperCase(),
      shares: parseFloat(formData.shares),
      averagePrice: parseFloat(formData.averagePrice)
    });

    // Reset form
    setFormData({
      symbol: '',
      shares: '',
      averagePrice: '',
      sector: 'Technology'
    });
    setIsOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) {
    return (
      <div className="add-position-widget">
        <button 
          className="add-position-button"
          onClick={() => setIsOpen(true)}
        >
          <span className="button-icon">📈</span>
          <span className="button-text">Add New Position</span>
        </button>
        <p className="widget-description">
          Track your investments by adding stocks to your portfolio
        </p>
      </div>
    );
  }

  return (
    <div className="add-position-form-overlay">
      <div className="add-position-form">
        <div className="form-header">
          <div className="header-content">
            <div className="form-icon">📊</div>
            <div className="header-text">
              <h3>Add New Position</h3>
              <p className="form-subtitle">Enter your stock position details</p>
            </div>
          </div>
          <button 
            className="close-button"
            onClick={() => setIsOpen(false)}
            title="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="form-error">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="symbol">
                <span className="label-text">Stock Symbol</span>
                <span className="label-required">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="symbol"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleChange}
                  placeholder="e.g., AAPL, GOOGL, MSFT"
                  autoComplete="off"
                  className="symbol-input"
                />
                <span className="input-icon">🔍</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="sector">
                <span className="label-text">Sector</span>
              </label>
              <div className="select-wrapper">
                <select
                  id="sector"
                  name="sector"
                  value={formData.sector}
                  onChange={handleChange}
                >
                  {SECTORS.map(sector => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
                <span className="select-arrow">▼</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="shares">
                <span className="label-text">Number of Shares</span>
                <span className="label-required">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="number"
                  id="shares"
                  name="shares"
                  value={formData.shares}
                  onChange={handleChange}
                  placeholder="100"
                  step="any"
                  min="0"
                />
                <span className="input-icon">📊</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="averagePrice">
                <span className="label-text">Average Price</span>
                <span className="label-required">*</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="number"
                  id="averagePrice"
                  name="averagePrice"
                  value={formData.averagePrice}
                  onChange={handleChange}
                  placeholder="150.50"
                  step="any"
                  min="0"
                />
                <span className="input-icon">💰</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-button"
              onClick={() => setIsOpen(false)}
            >
              <span className="button-icon">✕</span>
              Cancel
            </button>
            <button type="submit" className="submit-button">
              <span className="button-icon">✓</span>
              Add Position
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPositionForm; 