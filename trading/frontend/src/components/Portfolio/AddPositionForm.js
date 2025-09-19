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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Validate form
    if (!formData.symbol?.trim()) {
      setError('Stock symbol is required');
      setIsSubmitting(false);
      return;
    }
    if (!formData.shares || parseFloat(formData.shares) <= 0) {
      setError('Number of shares must be greater than 0');
      setIsSubmitting(false);
      return;
    }
    if (!formData.averagePrice || parseFloat(formData.averagePrice) <= 0) {
      setError('Average price must be greater than 0');
      setIsSubmitting(false);
      return;
    }

    try {
      // Submit form
      await onSubmit({
        ...formData,
        symbol: formData.symbol.trim().toUpperCase(),
        shares: parseFloat(formData.shares),
        averagePrice: parseFloat(formData.averagePrice)
      });

      // Reset form on success
      setFormData({
        symbol: '',
        shares: '',
        averagePrice: '',
        sector: 'Technology'
      });
      setIsOpen(false);
    } catch (err) {
      setError('Failed to add position. Please try again.');
      console.error('Error adding position:', err);
    } finally {
      setIsSubmitting(false);
    }
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
          Track your investments by adding stocks to your portfolio. Click to get started!
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
                  className="form-input symbol-input"
                  required
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
                  className="form-select"
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
                  min="0.01"
                  className="form-input"
                  required
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
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  required
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
            <button 
              type="submit" 
              className={`submit-button ${isSubmitting ? 'submitting' : ''}`}
              disabled={isSubmitting}
            >
              <span className="button-icon">{isSubmitting ? '⏳' : '✓'}</span>
              {isSubmitting ? 'Adding...' : 'Add Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPositionForm; 