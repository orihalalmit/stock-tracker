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
      <button 
        className="add-position-button"
        onClick={() => setIsOpen(true)}
      >
        + Add Position
      </button>
    );
  }

  return (
    <div className="add-position-form">
      <div className="form-header">
        <h3>Add New Position</h3>
        <button 
          className="close-button"
          onClick={() => setIsOpen(false)}
        >
          ×
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="symbol">Symbol</label>
          <input
            type="text"
            id="symbol"
            name="symbol"
            value={formData.symbol}
            onChange={handleChange}
            placeholder="e.g., AAPL"
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label htmlFor="shares">Number of Shares</label>
          <input
            type="number"
            id="shares"
            name="shares"
            value={formData.shares}
            onChange={handleChange}
            placeholder="e.g., 100"
            step="any"
            min="0"
          />
        </div>

        <div className="form-group">
          <label htmlFor="averagePrice">Average Price</label>
          <input
            type="number"
            id="averagePrice"
            name="averagePrice"
            value={formData.averagePrice}
            onChange={handleChange}
            placeholder="e.g., 150.50"
            step="any"
            min="0"
          />
        </div>

        <div className="form-group">
          <label htmlFor="sector">Sector</label>
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
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </button>
          <button type="submit" className="submit-button">
            Add Position
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddPositionForm; 