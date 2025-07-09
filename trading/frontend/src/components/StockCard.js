import React from 'react';
import './StockCard.css';

const StockCard = ({ stock, showPremarket = false }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatChange = (change) => {
    return (change >= 0 ? '+' : '') + change.toFixed(2);
  };

  const formatPercent = (percent) => {
    return (percent >= 0 ? '+' : '') + percent.toFixed(2) + '%';
  };

  const formatVolume = (volume) => {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(1) + 'M';
    } else if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + 'K';
    }
    return volume.toLocaleString();
  };

  const isPositive = stock.change >= 0;
  const changeClass = isPositive ? 'positive' : 'negative';
  const arrow = isPositive ? '↗' : '↘';

  // Pre-market data
  const hasPreMarketData = showPremarket && stock.preMarketData;
  const preMarketPositive = hasPreMarketData ? stock.preMarketData.changePercent >= 0 : false;
  const preMarketClass = preMarketPositive ? 'positive' : 'negative';
  
  // Intraday data
  const intradayPositive = hasPreMarketData && stock.intradayData ? stock.intradayData.changePercent >= 0 : false;
  const intradayClass = intradayPositive ? 'positive' : 'negative';

  return (
    <div className={`stock-card ${changeClass}`}>
      <div className="stock-header">
        <h3 className="stock-symbol">{stock.symbol}</h3>
        <span className={`change-arrow ${changeClass}`}>{arrow}</span>
      </div>
      
      <div className="stock-price">
        {formatPrice(stock.price)}
      </div>
      
      <div className="stock-change">
        <span className={`change-amount ${changeClass}`}>
          {formatChange(stock.change)}
        </span>
        <span className={`change-percent ${changeClass}`}>
          ({formatPercent(stock.changePercent)})
        </span>
      </div>

      {/* Extended hours data section */}
      {hasPreMarketData && (
        <div className="premarket-section">
          <div className="premarket-header">
            <div className="premarket-title">Extended Hours Analysis</div>
            {stock.marketContext && (
              <div className="market-status">
                {stock.marketContext.isPreMarket && <span className="status-badge premarket">Pre-Market</span>}
                {stock.marketContext.isMarketOpen && <span className="status-badge market-open">Market Open</span>}
                {stock.marketContext.isAfterHours && <span className="status-badge after-hours">After Hours</span>}
              </div>
            )}
          </div>
          <div className="premarket-breakdown">
            <div className="premarket-item">
              <div className="premarket-label">Overnight Gap:</div>
              <div className="premarket-change">
                <span className={`change-amount ${preMarketClass}`}>
                  {formatChange(stock.preMarketData.change)}
                </span>
                <span className={`change-percent ${preMarketClass}`}>
                  ({formatPercent(stock.preMarketData.changePercent)})
                </span>
              </div>
              <div className="premarket-details">
                {stock.preMarketData.description}
              </div>
            </div>
            <div className="intraday-item">
              <div className="intraday-label">Market Session:</div>
              <div className="intraday-change">
                <span className={`change-amount ${intradayClass}`}>
                  {formatChange(stock.intradayData.change)}
                </span>
                <span className={`change-percent ${intradayClass}`}>
                  ({formatPercent(stock.intradayData.changePercent)})
                </span>
              </div>
              <div className="intraday-details">
                {stock.intradayData.description}
              </div>
            </div>
            {stock.totalDailyData && (
              <div className="total-daily-item">
                <div className="total-daily-label">Total Daily:</div>
                <div className="total-daily-change">
                  <span className={`change-amount ${stock.totalDailyData.change >= 0 ? 'positive' : 'negative'}`}>
                    {formatChange(stock.totalDailyData.change)}
                  </span>
                  <span className={`change-percent ${stock.totalDailyData.change >= 0 ? 'positive' : 'negative'}`}>
                    ({formatPercent(stock.totalDailyData.changePercent)})
                  </span>
                </div>
                <div className="total-daily-details">
                  {stock.totalDailyData.description}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="stock-details">
        <div className="detail-row">
          <span className="detail-label">Open:</span>
          <span className="detail-value">{formatPrice(stock.open)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">High:</span>
          <span className="detail-value">{formatPrice(stock.high)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Low:</span>
          <span className="detail-value">{formatPrice(stock.low)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Volume:</span>
          <span className="detail-value">{formatVolume(stock.volume)}</span>
        </div>
      </div>
    </div>
  );
};

export default StockCard; 