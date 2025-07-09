import React from 'react';
import './BitcoinCard.css';

const BitcoinCard = ({ bitcoin }) => {
  if (!bitcoin) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatChange = (change) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(change));
  };

  const formatPercent = (percent) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const isPositive = bitcoin.dailyChangePercent >= 0;

  return (
    <div className="bitcoin-card">
      <div className="bitcoin-header">
        <h3 className="bitcoin-symbol">{bitcoin.symbol}</h3>
        <div className="bitcoin-name">Bitcoin</div>
      </div>
      
      <div className="bitcoin-price">
        {formatPrice(bitcoin.price)}
      </div>
      
      <div className={`bitcoin-change ${isPositive ? 'positive' : 'negative'}`}>
        <span className="change-amount">
          {isPositive ? '+' : '-'}{formatChange(bitcoin.dailyChange)}
        </span>
        <span className="change-percent">
          {formatPercent(bitcoin.dailyChangePercent)}
        </span>
      </div>
      
      {bitcoin.error && (
        <div className="bitcoin-error">
          {bitcoin.error}
        </div>
      )}
    </div>
  );
};

export default BitcoinCard; 