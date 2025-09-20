import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PortfolioSummary.css';

const formatCurrency = (value, currency = 'USD') => {
  if (typeof value !== 'number' || isNaN(value)) {
    return currency === 'USD' ? '$0.00' : '₪0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatPercentage = (value) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '+0.00%';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always'
  }).format(value / 100);
};


const FearGreedIndex = () => {
  const [fearGreedData, setFearGreedData] = useState({ score: 50 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFearGreedIndex = async () => {
      try {
        const response = await axios.get('/api/market/fear-greed');
        setFearGreedData(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch Fear & Greed index:', err);
        setError('Failed to load market sentiment');
      } finally {
        setLoading(false);
      }
    };

    fetchFearGreedIndex();
  }, []);

  let sentiment;
  const value = fearGreedData.score;
  if (value <= 25) sentiment = 'Extreme Fear';
  else if (value <= 45) sentiment = 'Fear';
  else if (value <= 55) sentiment = 'Neutral';
  else if (value <= 75) sentiment = 'Greed';
  else sentiment = 'Extreme Greed';

  // Helper function to format historical values
  const formatHistoricalValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }
    return value.toString();
  };

  if (loading) {
    return (
      <div className="fear-greed-card">
        <div className="fear-greed-header">
          <h2>Fear & Greed Index</h2>
          <div className="sentiment-tag">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fear-greed-card">
        <div className="fear-greed-header">
          <h2>Fear & Greed Index</h2>
          <div className="sentiment-tag error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fear-greed-card">
      <div className="fear-greed-header">
        <h2>Fear & Greed Index</h2>
        <div className="sentiment-tag">{sentiment}</div>
      </div>
      <div className="fear-greed-scale">
        <div className="scale-bar">
          <div className="scale-indicator" style={{ left: `${value}%` }}></div>
        </div>
        <div className="scale-labels">
          <span>Extreme Fear</span>
          <span>Neutral</span>
          <span>Extreme Greed</span>
        </div>
      </div>
      <div className="fear-greed-details">
        <p>Current Score: <span>{value}</span></p>
        <p>Previous Close: <span>{formatHistoricalValue(fearGreedData.previousClose)}</span></p>
        <p>1 Week Ago: <span>{formatHistoricalValue(fearGreedData.oneWeekAgo)}</span></p>
        <p>1 Month Ago: <span>{formatHistoricalValue(fearGreedData.oneMonthAgo)}</span></p>
      </div>
      <p className="fear-greed-description">
        The Fear & Greed Index measures market sentiment from 0 (extreme fear) to 100 (extreme greed), helping identify potential buying or selling opportunities.
      </p>
    </div>
  );
};

const PortfolioSummary = ({ portfolio, showPremarket = false }) => {
  const { positions = [], summary = {} } = portfolio;
  const [historicalData, setHistoricalData] = useState({});
  const [historicalLoading, setHistoricalLoading] = useState(true);
  const [isHoldingsExpanded, setIsHoldingsExpanded] = useState(false);
  const [showInILS, setShowInILS] = useState(false);
  const [usdIlsRate] = useState(0);
  const [usdIlsPreviousRate] = useState(0);
  
  // Use the pre-calculated summary values from the backend
  const {
    totalValue = 0,
    totalDailyGain = 0,
    totalDailyGainPercentage = 0,
    totalOverallGain = 0,
    totalOverallGainPercentage = 0,
    preMarketSummary = null,
    intradaySummary = null
  } = summary;


  // Convert USD value to ILS
  const convertToILS = (usdValue) => {
    return usdValue * usdIlsRate;
  };

  // Get the appropriate value based on currency selection
  const getValueByCurrency = (usdValue) => {
    if (showInILS && usdIlsRate > 0) {
      return convertToILS(usdValue);
    }
    return usdValue;
  };

  // Calculate daily gain that includes USD/ILS rate change impact
  const calculateDailyGainWithRateChange = (position) => {
    if (!showInILS || usdIlsRate <= 0 || usdIlsPreviousRate <= 0) {
      return position.dailyChange;
    }
    
    // Calculate yesterday's value in USD
    const yesterdayValueUSD = position.totalValue - position.dailyChange;
    
    // Calculate yesterday's value in ILS using yesterday's rate
    const yesterdayValueILS = yesterdayValueUSD * usdIlsPreviousRate;
    
    // Calculate today's value in ILS using today's rate
    const todayValueILS = position.totalValue * usdIlsRate;
    
    // The daily change in ILS includes both stock price change and exchange rate change
    return todayValueILS - yesterdayValueILS;
  };

  // Calculate total daily gain with exchange rate impact
  const calculateTotalDailyGainWithRateChange = () => {
    if (!showInILS || usdIlsRate <= 0 || usdIlsPreviousRate <= 0) {
      return totalDailyGain;
    }
    
    // Calculate yesterday's total value in USD
    const yesterdayTotalValueUSD = totalValue - totalDailyGain;
    
    // Calculate yesterday's total value in ILS using yesterday's rate
    const yesterdayTotalValueILS = yesterdayTotalValueUSD * usdIlsPreviousRate;
    
    // Calculate today's total value in ILS using today's rate
    const todayTotalValueILS = totalValue * usdIlsRate;
    
    // The total daily change in ILS includes both stock price changes and exchange rate change
    return todayTotalValueILS - yesterdayTotalValueILS;
  };

  // Format currency based on selected currency
  const formatPortfolioCurrency = (value) => {
    return formatCurrency(value, showInILS ? 'ILS' : 'USD');
  };

  // Fetch historical performance data
  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!portfolio._id) return;
      
      try {
        setHistoricalLoading(true);
        const response = await axios.get(`/api/portfolio/${portfolio._id}/historical`);
        setHistoricalData(response.data);
      } catch (error) {
        console.error('Failed to fetch historical data:', error);
        setHistoricalData({});
      } finally {
        setHistoricalLoading(false);
      }
    };

    fetchHistoricalData();
  }, [portfolio._id]);

  // Format historical value without currency conversion
  const formatHistoricalValue = (data) => {
    if (!data || historicalLoading) return { value: 'Loading...', subtext: 'Calculating...' };
    
    const change = data.change || 0;
    const changePercentage = data.changePercentage || 0;
    
    return {
      // Always use USD for historical values, regardless of ILS setting
      value: formatCurrency(change, 'USD'),
      subtext: formatPercentage(changePercentage),
      isPositive: change >= 0
    };
  };

  return (
    <div className="portfolio-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Portfolio Dashboard</h1>
          <p className="subtitle">Track your investments with real market data</p>
        </div>
        <div className="currency-toggle">
          <label className="currency-checkbox" title="Convert portfolio values using current USD/ILS exchange rate" style={{ fontSize: '0.75rem' }}>
            <input 
              type="checkbox" 
              checked={showInILS} 
              onChange={() => setShowInILS(!showInILS)} 
            />
ILS
          </label>
          {showInILS && usdIlsRate > 0 && (
            <div className="exchange-rate-info">
              1 USD = {usdIlsRate.toFixed(4)} ILS
              {usdIlsRate !== usdIlsPreviousRate && (
                <span className={usdIlsRate > usdIlsPreviousRate ? "rate-change positive" : "rate-change negative"}>
                  ({((usdIlsRate / usdIlsPreviousRate - 1) * 100).toFixed(2)}%)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-title">Portfolio Value</span>
            <span className="card-icon">{showInILS ? '₪' : '$'}</span>
          </div>
          <div className="card-value">{formatPortfolioCurrency(getValueByCurrency(totalValue))}</div>
          <div className="card-subtext">Total market value</div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-title">Total Gain/Loss</span>
            <span className="card-icon">📈</span>
          </div>
          <div className="card-value" style={{ color: totalOverallGain >= 0 ? '#0ECB81' : '#F6465D' }}>
            {formatPortfolioCurrency(getValueByCurrency(totalOverallGain))}
          </div>
          <div className="card-subtext">{formatPercentage(totalOverallGainPercentage)}</div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-title">Today's Change</span>
            <span className="card-icon">📊</span>
          </div>
          <div className="card-value" style={{ color: (showInILS ? calculateTotalDailyGainWithRateChange() : totalDailyGain) >= 0 ? '#0ECB81' : '#F6465D' }}>
            {formatPortfolioCurrency(showInILS ? calculateTotalDailyGainWithRateChange() : totalDailyGain)}
          </div>
          <div className="card-subtext">
            {formatPercentage(totalDailyGainPercentage)}
            {showInILS && usdIlsRate > 0 && usdIlsPreviousRate > 0 && (
              <span className="rate-impact-badge">Includes exchange rate impact</span>
            )}
          </div>
        </div>

        {/* Pre-market cards - show when premarket data is available */}
        {showPremarket && preMarketSummary && (
          <>
            <div className="dashboard-card premarket-card">
              <div className="card-header">
                <span className="card-title">Pre-Market Gap</span>
                <span className="card-icon">🌅</span>
              </div>
              <div className="card-value" style={{ color: preMarketSummary.totalGain >= 0 ? '#0ECB81' : '#F6465D' }}>
                {formatPortfolioCurrency(getValueByCurrency(preMarketSummary.totalGain))}
              </div>
              <div className="card-subtext">{formatPercentage(preMarketSummary.totalGainPercentage)}</div>
            </div>

            <div className="dashboard-card intraday-card">
              <div className="card-header">
                <span className="card-title">Intraday Change</span>
                <span className="card-icon">📈</span>
              </div>
              <div className="card-value" style={{ color: intradaySummary.totalGain >= 0 ? '#0ECB81' : '#F6465D' }}>
                {formatPortfolioCurrency(getValueByCurrency(intradaySummary.totalGain))}
              </div>
              <div className="card-subtext">{formatPercentage(intradaySummary.totalGainPercentage)}</div>
            </div>
          </>
        )}

        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-title">Holdings</span>
            <span className="card-icon">🎯</span>
          </div>
          <div className="card-value">{positions.length}</div>
          <div className="card-subtext">Total positions</div>
        </div>
      </div>

      {/* Extended hours summary cards */}
      {showPremarket && (preMarketSummary || intradaySummary) && (
        <div className="extended-hours-summary">
          <div className="extended-hours-title">Extended Hours Breakdown</div>
          <div className="extended-hours-cards">
            {preMarketSummary && (
              <div className="summary-card overnight-gap">
                <div className="card-header">
                  <h3>Overnight Gap</h3>
                  <span className="card-subtitle">Close → Open</span>
                </div>
                <div className="card-content">
                  <div className={`main-value ${preMarketSummary.totalGain >= 0 ? 'positive' : 'negative'}`}>
                    {formatPortfolioCurrency(getValueByCurrency(preMarketSummary.totalGain))}
                  </div>
                  <div className={`percentage ${preMarketSummary.totalGainPercentage >= 0 ? 'positive' : 'negative'}`}>
                    {formatPercentage(preMarketSummary.totalGainPercentage)}
                  </div>
                </div>
              </div>
            )}
            {intradaySummary && (
              <div className="summary-card regular-session">
                <div className="card-header">
                  <h3>Regular Session</h3>
                  <span className="card-subtitle">Open → Current</span>
                </div>
                <div className="card-content">
                  <div className={`main-value ${intradaySummary.totalGain >= 0 ? 'positive' : 'negative'}`}>
                    {formatPortfolioCurrency(getValueByCurrency(intradaySummary.totalGain))}
                  </div>
                  <div className={`percentage ${intradaySummary.totalGainPercentage >= 0 ? 'positive' : 'negative'}`}>
                    {formatPercentage(intradaySummary.totalGainPercentage)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historical Performance */}
                <div className="historical-section">
            <h3>Historical Performance {showInILS && <span className="historical-usd-note">(Values shown in USD)</span>}</h3>
        <div className="historical-grid">
          <div className="historical-period">
            <div className="period-label">1D</div>
                          <div className={`period-value ${formatHistoricalValue(historicalData['1D']).isPositive ? 'positive' : 'negative'}`}>
                {formatHistoricalValue(historicalData['1D']).value}
              </div>
            <div className={`period-subtext ${formatHistoricalValue(historicalData['1D']).isPositive ? 'positive' : 'negative'}`}>
              {formatHistoricalValue(historicalData['1D']).subtext}
            </div>
          </div>
          <div className="historical-period">
            <div className="period-label">1W</div>
                          <div className={`period-value ${formatHistoricalValue(historicalData['1W']).isPositive ? 'positive' : 'negative'}`}>
                {formatHistoricalValue(historicalData['1W']).value}
              </div>
            <div className={`period-subtext ${formatHistoricalValue(historicalData['1W']).isPositive ? 'positive' : 'negative'}`}>
              {formatHistoricalValue(historicalData['1W']).subtext}
            </div>
          </div>
          <div className="historical-period">
            <div className="period-label">1M</div>
                          <div className={`period-value ${formatHistoricalValue(historicalData['1M']).isPositive ? 'positive' : 'negative'}`}>
                {formatHistoricalValue(historicalData['1M']).value}
              </div>
            <div className={`period-subtext ${formatHistoricalValue(historicalData['1M']).isPositive ? 'positive' : 'negative'}`}>
              {formatHistoricalValue(historicalData['1M']).subtext}
            </div>
          </div>
          <div className="historical-period">
            <div className="period-label">3M</div>
            <div className={`period-value ${formatHistoricalValue(historicalData['3M']).isPositive ? 'positive' : 'negative'}`}>
              {formatHistoricalValue(historicalData['3M']).value}
            </div>
            <div className={`period-subtext ${formatHistoricalValue(historicalData['3M']).isPositive ? 'positive' : 'negative'}`}>
              {formatHistoricalValue(historicalData['3M']).subtext}
            </div>
          </div>
          <div className="historical-period">
            <div className="period-label">1Y</div>
            <div className={`period-value ${formatHistoricalValue(historicalData['1Y']).isPositive ? 'positive' : 'negative'}`}>
              {formatHistoricalValue(historicalData['1Y']).value}
            </div>
            <div className={`period-subtext ${formatHistoricalValue(historicalData['1Y']).isPositive ? 'positive' : 'negative'}`}>
              {formatHistoricalValue(historicalData['1Y']).subtext}
            </div>
          </div>
        </div>
        <div className="historical-note">
          Historical performance calculated assuming long-term holdings. 1D uses real previous close data, while 1W/1M/3M/1Y use estimated historical prices based on typical market volatility patterns.
          <br />
          <small style={{ color: '#707A8A', fontSize: '11px' }}>
            Note: Historical estimates are approximations and may not reflect actual past performance.
          </small>
        </div>
      </div>

      <div className="dashboard-grid-extended">
        <div className="holdings-section">
          <div className="section-header collapsible-header" onClick={() => setIsHoldingsExpanded(!isHoldingsExpanded)}>
            <div className="header-content">
              <h2>Your Holdings</h2>
              <span className="section-subtitle">
                {positions.length} positions • {formatPortfolioCurrency(getValueByCurrency(totalValue))} total value
              </span>
            </div>
            <div className="collapse-indicator">
              <span className={`chevron ${isHoldingsExpanded ? 'expanded' : ''}`}>▼</span>
            </div>
          </div>

          {/* Holdings Summary - Always visible */}
          <div className="holdings-summary">
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-label">Top Holding</span>
                <span className="stat-value top-holding">
                  {positions.length > 0 ? positions.sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))[0].symbol : 'N/A'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Best Performer</span>
                <span className="stat-value best-performer">
                  {positions.length > 0 ? 
                    positions.sort((a, b) => (b.overallGainPercentage || 0) - (a.overallGainPercentage || 0))[0].symbol : 'N/A'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Worst Performer</span>
                <span className="stat-value worst-performer">
                  {positions.length > 0 ? 
                    positions.sort((a, b) => (a.overallGainPercentage || 0) - (b.overallGainPercentage || 0))[0].symbol : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Holdings - Collapsible */}
          <div className={`holdings-list ${isHoldingsExpanded ? 'expanded' : 'collapsed'}`}>
            {positions
              .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
              .map(position => {
                const {
                  symbol,
                  shares,
                  averagePrice,
                  sector,
                  name,
                  currentPrice = 0,
                  totalValue = 0,
                  overallGain = 0,
                  overallGainPercentage = 0,
                  dailyChange = 0,
                  dailyChangePercentage = 0
                } = position;

                return (
                  <div key={symbol} className="holding-item">
                    <div className="holding-info">
                      <div className="holding-symbol">
                        <span className="symbol">{symbol}</span>
                        <span className="sector-tag">{sector || 'N/A'}</span>
                      </div>
                      <div className="holding-name">{name || symbol}</div>
                      <div className="holding-details">
                        {shares} shares × purchased at {formatCurrency(showInILS && usdIlsRate > 0 ? averagePrice * usdIlsRate : averagePrice, showInILS ? 'ILS' : 'USD')}
                      </div>
                      <div className="holding-daily-change" style={{ color: (showInILS ? calculateDailyGainWithRateChange(position) : dailyChange) >= 0 ? '#0ECB81' : '#F6465D' }}>
                        Today: {formatPortfolioCurrency(showInILS ? calculateDailyGainWithRateChange(position) : dailyChange)} 
                        ({formatPercentage(dailyChangePercentage)})
                        {showInILS && usdIlsRate > 0 && usdIlsPreviousRate > 0 && (
                          <span className="rate-impact-note">includes exchange rate impact</span>
                        )}
                      </div>
                    </div>
                    <div className="holding-value">
                      <div className="current-value">
                        <div className="value-label">VALUE</div>
                        <div className="current-price-display">
                          <span className="price-label">Current Price:</span>
                          <span className="price-amount">{formatCurrency(showInILS && usdIlsRate > 0 ? currentPrice * usdIlsRate : currentPrice, showInILS ? 'ILS' : 'USD')}</span>
                        </div>
                        <div className="value-amount">{formatPortfolioCurrency(getValueByCurrency(totalValue))}</div>
                        <div className="value-change" style={{ color: overallGain >= 0 ? '#0ECB81' : '#F6465D' }}>
                          {formatPortfolioCurrency(getValueByCurrency(overallGain))} ({formatPercentage(overallGainPercentage)})
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PortfolioSummary;
export { FearGreedIndex }; 