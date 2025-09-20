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
  const [successMessage, setSuccessMessage] = useState('');

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
      const result = await onSubmit({
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
      setError('');
      
      // Show success message
      setSuccessMessage('Position added successfully!');
      setTimeout(() => {
        setSuccessMessage('');
        setIsOpen(false);
      }, 2000);
      
    } catch (err) {
      console.error('Form submission error:', err);
      
      // Extract more specific error message
      let errorMessage = 'Failed to add position. Please try again.';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
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
      </div>
    );
  }

  return (
    <div className="add-position-inline-form">
      <div className="inline-form-header">
        <h3>📊 Add New Position</h3>
        <button 
          className="collapse-button"
          onClick={() => setIsOpen(false)}
          title="Collapse"
        >
          ▲ Collapse
        </button>
      </div>
      
      {error && (
        <div className="form-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="form-success">
          <span className="success-icon">✅</span>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="inline-form">
        <div className="inline-form-row">
          <div className="form-group">
            <label htmlFor="symbol">Stock Symbol *</label>
            <input
              type="text"
              id="symbol"
              name="symbol"
              value={formData.symbol}
              onChange={handleChange}
              placeholder="AAPL"
              autoComplete="off"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="shares">Shares *</label>
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
          </div>

          <div className="form-group">
            <label htmlFor="averagePrice">Price *</label>
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
          </div>

          <div className="form-group">
            <label htmlFor="sector">Sector</label>
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
          </div>

          <div className="form-group">
            <button 
              type="submit" 
              className={`inline-submit-button ${isSubmitting ? 'submitting' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? '⏳ Adding...' : '✓ Add Position'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddPositionForm;