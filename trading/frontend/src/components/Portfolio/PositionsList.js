import React, { useState } from 'react';
import axios from 'axios';
import './PositionsList.css';

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

const PositionsList = ({ positions, portfolioId, onPositionUpdate, portfolioSummary }) => {
  const [sortBy, setSortBy] = useState('totalValue');
  const [sortOrder, setSortOrder] = useState('desc');
  const [editingPosition, setEditingPosition] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return (value >= 0 ? '+' : '') + (value || 0).toFixed(2) + '%';
  };

  const formatPortfolioPercent = (value) => {
    return (value || 0).toFixed(2) + '%';
  };

  const calculatePortfolioPercentage = (positionValue) => {
    const totalValue = portfolioSummary?.totalValue || 0;
    if (totalValue === 0) return 0;
    return (positionValue / totalValue) * 100;
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleEdit = (position) => {
    setEditingPosition(position.symbol);
    setEditFormData({
      shares: position.shares,
      averagePrice: position.averagePrice,
      sector: position.sector || 'Technology'
    });
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingPosition(null);
    setEditFormData({});
    setError('');
  };

  const handleSaveEdit = async (symbol) => {
    if (!editFormData.shares || editFormData.shares <= 0) {
      setError('Shares must be greater than 0');
      return;
    }
    if (!editFormData.averagePrice || editFormData.averagePrice <= 0) {
      setError('Average price must be greater than 0');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get the raw portfolio data to find positions with this symbol
      const portfolioResponse = await axios.get(`/api/portfolio/${portfolioId}`);
      const portfolio = portfolioResponse.data;
      
      // Since positions are consolidated in the response, we need to work differently
      // We'll delete all positions with this symbol and add a new consolidated one
      
      // First, get the raw portfolio from the database (not the consolidated view)
      const rawPortfolioResponse = await axios.get(`/api/portfolio`);
      const rawPortfolios = rawPortfolioResponse.data;
      const rawPortfolio = rawPortfolios.find(p => p._id === portfolioId);
      
      if (!rawPortfolio) {
        throw new Error('Portfolio not found');
      }
      
      // Find all raw positions with this symbol
      const positionsToDelete = rawPortfolio.positions.filter(p => p.symbol === symbol);
      
      // Delete all positions with this symbol
      for (const position of positionsToDelete) {
        await axios.delete(`/api/portfolio/${portfolioId}/positions/${position._id}`);
      }
      
      // Add the new consolidated position
      await axios.post(`/api/portfolio/${portfolioId}/positions`, {
        symbol: symbol,
        shares: parseFloat(editFormData.shares),
        averagePrice: parseFloat(editFormData.averagePrice),
        sector: editFormData.sector
      });

      setEditingPosition(null);
      setEditFormData({});
      
      // Refresh the portfolio data
      if (onPositionUpdate) {
        onPositionUpdate();
      }
    } catch (err) {
      console.error('Error updating position:', err);
      setError('Failed to update position');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (symbol) => {
    if (!window.confirm(`Are you sure you want to delete all ${symbol} positions from your portfolio? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get the raw portfolio data to find all positions with this symbol
      const rawPortfolioResponse = await axios.get(`/api/portfolio`);
      const rawPortfolios = rawPortfolioResponse.data;
      const rawPortfolio = rawPortfolios.find(p => p._id === portfolioId);
      
      if (!rawPortfolio) {
        throw new Error('Portfolio not found');
      }
      
      // Find all raw positions with this symbol
      const positionsToDelete = rawPortfolio.positions.filter(p => p.symbol === symbol);
      
      // Delete all positions with this symbol
      for (const position of positionsToDelete) {
        await axios.delete(`/api/portfolio/${portfolioId}/positions/${position._id}`);
      }
      
      // Refresh the portfolio data
      if (onPositionUpdate) {
        onPositionUpdate();
      }
    } catch (err) {
      console.error('Error deleting position:', err);
      setError('Failed to delete position');
    } finally {
      setLoading(false);
    }
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const sortPositions = (positions) => {
    return [...positions].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'totalValue':
          aValue = a.totalValue || 0;
          bValue = b.totalValue || 0;
          break;
        case 'symbol':
          return sortOrder === 'asc'
            ? a.symbol.localeCompare(b.symbol)
            : b.symbol.localeCompare(a.symbol);
        case 'shares':
          aValue = a.shares || 0;
          bValue = b.shares || 0;
          break;
        case 'overallGain':
          aValue = a.overallGain || 0;
          bValue = b.overallGain || 0;
          break;
        case 'dailyChange':
          aValue = a.dailyChange || 0;
          bValue = b.dailyChange || 0;
          break;
        case 'portfolioPercent':
          aValue = calculatePortfolioPercentage(a.totalValue || 0);
          bValue = calculatePortfolioPercentage(b.totalValue || 0);
          break;
        default:
          return 0;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
  };

  const sortedPositions = sortPositions(positions);

  return (
    <div className="positions-list">
      <h3>Portfolio Positions</h3>
      
      {error && <div className="positions-error">{error}</div>}

      <div className="positions-table-container">
        <table className="positions-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('symbol')} className={sortBy === 'symbol' ? 'active' : ''}>
                Symbol {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Sector</th>
              <th onClick={() => handleSort('shares')} className={sortBy === 'shares' ? 'active' : ''}>
                Shares {sortBy === 'shares' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Avg Price</th>
              <th>Current Price</th>
              <th onClick={() => handleSort('totalValue')} className={sortBy === 'totalValue' ? 'active' : ''}>
                Value {sortBy === 'totalValue' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('portfolioPercent')} className={sortBy === 'portfolioPercent' ? 'active' : ''}>
                Portfolio % {sortBy === 'portfolioPercent' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('overallGain')} className={sortBy === 'overallGain' ? 'active' : ''}>
                Total Gain/Loss {sortBy === 'overallGain' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('dailyChange')} className={sortBy === 'dailyChange' ? 'active' : ''}>
                Daily Change {sortBy === 'dailyChange' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedPositions.map((position) => {
              const isOverallPositive = (position.overallGain || 0) >= 0;
              const isDailyPositive = (position.dailyChange || 0) >= 0;
              const isEditing = editingPosition === position.symbol;

              return (
                <tr key={position.symbol} className={isEditing ? 'editing' : ''}>
                  <td className="symbol">{position.symbol}</td>
                  <td className="sector">
                    {isEditing ? (
                      <select
                        value={editFormData.sector}
                        onChange={(e) => handleEditFormChange('sector', e.target.value)}
                        className="edit-input"
                      >
                        {SECTORS.map(sector => (
                          <option key={sector} value={sector}>{sector}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="sector-badge">{position.sector}</span>
                    )}
                  </td>
                  <td className="shares">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editFormData.shares}
                        onChange={(e) => handleEditFormChange('shares', e.target.value)}
                        className="edit-input"
                        min="0"
                        step="any"
                      />
                    ) : (
                      position.shares
                    )}
                  </td>
                  <td className="price">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editFormData.averagePrice}
                        onChange={(e) => handleEditFormChange('averagePrice', e.target.value)}
                        className="edit-input"
                        min="0"
                        step="any"
                      />
                    ) : (
                      formatCurrency(position.averagePrice)
                    )}
                  </td>
                  <td className="price">{formatCurrency(position.currentPrice)}</td>
                  <td className="value">{formatCurrency(position.totalValue)}</td>
                  <td className="portfolio-percent">{formatPortfolioPercent(calculatePortfolioPercentage(position.totalValue))}</td>
                  <td className={`gain-loss ${isOverallPositive ? 'positive' : 'negative'}`}>
                    {formatCurrency(position.overallGain)}
                    <span className="percent">({formatPercent(position.overallGainPercentage)})</span>
                  </td>
                  <td className={`gain-loss ${isDailyPositive ? 'positive' : 'negative'}`}>
                    {formatCurrency(position.dailyChange)}
                    <span className="percent">({formatPercent(position.dailyChangePercentage)})</span>
                  </td>
                  <td className="actions">
                    {isEditing ? (
                      <div className="edit-actions">
                        <button
                          onClick={() => handleSaveEdit(position.symbol)}
                          disabled={loading}
                          className="save-btn"
                          title="Save changes"
                        >
                          {loading ? '...' : '✓'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={loading}
                          className="cancel-btn"
                          title="Cancel editing"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="position-actions">
                        <button
                          onClick={() => handleEdit(position)}
                          className="edit-btn"
                          title="Edit position"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(position.symbol)}
                          className="delete-btn"
                          title="Delete position"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {positions.length === 0 && (
        <div className="no-positions">
          <p>No positions in portfolio</p>
        </div>
      )}
    </div>
  );
};

export default PositionsList; 