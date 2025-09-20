import React from 'react';
import './CurrencyCard.css';

const CurrencyCard = ({ currency }) => {
  const formatRate = (rate) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(rate);
  };

  const formatChange = (change) => {
    return (change >= 0 ? '+' : '') + change.toFixed(4);
  };

  const formatPercent = (percent) => {
    return (percent >= 0 ? '+' : '') + percent.toFixed(2) + '%';
  };

  const isPositive = currency.dailyChange >= 0;
  const changeClass = isPositive ? 'positive' : 'negative';
  const arrow = isPositive ? '↗' : '↘';

  return (
    <div className={`currency-card ${changeClass}`}>
      <div className="currency-header">
        <h3 className="currency-symbol">USD/ILS</h3>
        <span className={`change-arrow ${changeClass}`}>{arrow}</span>
      </div>
      
      <div className="currency-rate">
        ₪{formatRate(currency.rate)}
      </div>
      
      <div className="currency-change">
        <span className={`change-amount ${changeClass}`}>
          {formatChange(currency.dailyChange)}
        </span>
        <span className={`change-percent ${changeClass}`}>
          ({formatPercent(currency.dailyChangePercent)})
        </span>
      </div>
      
      <div className="currency-details">
        <div className="detail-row">
          <span className="detail-label">Previous Close</span>
          <span className="detail-value">₪{formatRate(currency.previousRate)}</span>
        </div>
      </div>
    </div>
  );
};

export default CurrencyCard; 