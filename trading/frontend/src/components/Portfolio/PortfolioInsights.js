import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PortfolioInsights.css';

const PortfolioInsights = ({ portfolio }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      if (!portfolio?._id) return;

      try {
        setLoading(true);
        const response = await axios.get(`/api/portfolio/${portfolio._id}/insights`);
        setInsights(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch portfolio insights:', err);
        setError('Failed to load portfolio insights');
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [portfolio?._id]);

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

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'Bullish': return '#0ECB81';
      case 'Bearish': return '#F6465D';
      default: return '#FFA500';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'Low': return '#0ECB81';
      case 'Medium': return '#FFA500';
      case 'High': return '#F6465D';
      default: return '#FFA500';
    }
  };

  const getVolatilityColor = (volatility) => {
    switch (volatility) {
      case 'Low': return '#0ECB81';
      case 'Medium': return '#FFA500';
      case 'High': return '#F6465D';
      default: return '#FFA500';
    }
  };

  if (loading) {
    return (
      <div className="portfolio-insights">
        <div className="insights-header">
          <h2>Portfolio Insights</h2>
          <div className="loading-spinner">Loading insights...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portfolio-insights">
        <div className="insights-header">
          <h2>Portfolio Insights</h2>
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="portfolio-insights">
        <div className="insights-header">
          <h2>Portfolio Insights</h2>
          <div className="no-data">No insights available</div>
        </div>
      </div>
    );
  }

  const { dailySummary, sentiment, insights: insightMessages } = insights;

  return (
    <div className="portfolio-insights">
      <div className="insights-header">
        <h2>📊 Portfolio Insights</h2>
        <div className="last-updated">
          Last updated: {new Date(insights.lastUpdated).toLocaleTimeString()}
        </div>
      </div>

      {/* Daily Summary Cards */}
      <div className="insights-grid">
        <div className="insight-card daily-performance">
          <div className="card-header">
            <h3>Today's Performance</h3>
            <span className="card-icon">📈</span>
          </div>
          <div className="card-content">
            <div className="performance-value" style={{ color: dailySummary.totalChange >= 0 ? '#0ECB81' : '#F6465D' }}>
              {formatCurrency(dailySummary.totalChange)}
            </div>
            <div className="performance-percent" style={{ color: dailySummary.totalChange >= 0 ? '#0ECB81' : '#F6465D' }}>
              {formatPercent(dailySummary.totalChangePercent)}
            </div>
            <div className="performance-breakdown">
              <span className="positive-positions">
                {dailySummary.positivePositions} up
              </span>
              <span className="negative-positions">
                {dailySummary.negativePositions} down
              </span>
              <span className="neutral-positions">
                {dailySummary.neutralPositions} flat
              </span>
            </div>
          </div>
        </div>

        <div className="insight-card sentiment-card">
          <div className="card-header">
            <h3>Enhanced Sentiment</h3>
            <span className="card-icon">🎯</span>
          </div>
          <div className="card-content">
            <div className="sentiment-value" style={{ color: getSentimentColor(sentiment.overall) }}>
              {sentiment.overall}
            </div>
            <div className="sentiment-score">
              Score: {sentiment.score || 50}/100 
              {sentiment.confidence && (
                <span className="confidence">
                  (Confidence: {Math.round(sentiment.confidence * 100)}%)
                </span>
              )}
            </div>
            <div className="sentiment-details">
              <div className="sentiment-item">
                <span>Risk Level:</span>
                <span style={{ color: getRiskColor(sentiment.riskLevel) }}>
                  {sentiment.riskLevel}
                </span>
              </div>
              <div className="sentiment-item">
                <span>Market Alignment:</span>
                <span style={{ color: sentiment.marketAlignment === 'Strongly Correlated' ? '#0ECB81' : 
                  sentiment.marketAlignment === 'Strongly Contrarian' ? '#F6465D' : '#FFA500' }}>
                  {sentiment.marketAlignment}
                </span>
              </div>
              {sentiment.volatilityMetrics && (
                <div className="sentiment-item">
                  <span>Sharpe Ratio:</span>
                  <span style={{ color: sentiment.volatilityMetrics.sharpeRatio > 1 ? '#0ECB81' : 
                    sentiment.volatilityMetrics.sharpeRatio > 0.5 ? '#FFA500' : '#F6465D' }}>
                    {sentiment.volatilityMetrics.sharpeRatio.toFixed(2)}
                    {sentiment.volatilityMetrics.dataPoints > 0 && (
                      <span className="data-points-info">
                        ({sentiment.volatilityMetrics.dataPoints} days)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="insight-card top-movers">
          <div className="card-header">
            <h3>Top Movers</h3>
            <span className="card-icon">🚀</span>
          </div>
          <div className="card-content">
            <div className="movers-section">
              <h4>Top Gainers</h4>
              {dailySummary.topGainers.length > 0 ? (
                <div className="movers-list">
                  {dailySummary.topGainers.map((gainer, index) => (
                    <div key={index} className="mover-item">
                      <span className="mover-symbol">{gainer.symbol}</span>
                      <span className="mover-change positive">
                        +{gainer.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-movers">No gainers today</div>
              )}
            </div>
            <div className="movers-section">
              <h4>Top Losers</h4>
              {dailySummary.topLosers.length > 0 ? (
                <div className="movers-list">
                  {dailySummary.topLosers.map((loser, index) => (
                    <div key={index} className="mover-item">
                      <span className="mover-symbol">{loser.symbol}</span>
                      <span className="mover-change negative">
                        {loser.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-movers">No losers today</div>
              )}
            </div>
          </div>
        </div>

        <div className="insight-card sector-performance">
          <div className="card-header">
            <h3>Sector Breakdown</h3>
            <span className="card-icon">🏭</span>
          </div>
          <div className="card-content">
            <div className="sector-list">
              {Object.entries(dailySummary.sectorPerformance)
                .sort(([,a], [,b]) => b.portfolioWeight - a.portfolioWeight)
                .map(([sector, data]) => (
                  <div key={sector} className="sector-item">
                    <div className="sector-info">
                      <span className="sector-name">{sector}</span>
                      <span className="sector-weight">{data.portfolioWeight.toFixed(1)}%</span>
                    </div>
                    <div className="sector-performance-bar">
                      <div 
                        className="sector-bar" 
                        style={{ 
                          width: `${data.portfolioWeight}%`,
                          backgroundColor: data.changePercent >= 0 ? '#0ECB81' : '#F6465D'
                        }}
                      ></div>
                    </div>
                    <div className="sector-change" style={{ color: data.changePercent >= 0 ? '#0ECB81' : '#F6465D' }}>
                      {formatPercent(data.changePercent)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Enhanced Sentiment Breakdown */}
        {sentiment.breakdown && (
          <div className="insight-card sentiment-breakdown">
            <div className="card-header">
              <h3>Sentiment Components</h3>
              <span className="card-icon">📊</span>
            </div>
            <div className="card-content">
              <div className="breakdown-list">
                {Object.entries(sentiment.breakdown).map(([component, data]) => (
                  <div key={component} className="breakdown-item">
                    <div className="breakdown-info">
                      <span className="breakdown-name">{data.description}</span>
                      <span className="breakdown-score">{Math.round(data.score)}/100</span>
                    </div>
                    <div className="breakdown-bar">
                      <div 
                        className="breakdown-fill" 
                        style={{ 
                          width: `${data.score}%`,
                          backgroundColor: data.score > 60 ? '#0ECB81' : data.score > 40 ? '#FFA500' : '#F6465D'
                        }}
                      ></div>
                    </div>
                    <div className="breakdown-weight">
                      Weight: {Math.round(data.weight * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Volatility Metrics */}
        {sentiment.volatilityMetrics && (
          <div className="insight-card volatility-metrics">
            <div className="card-header">
              <h3>Risk Metrics</h3>
              <span className="card-icon">📈</span>
            </div>
            <div className="card-content">
              <div className="metrics-grid">
                <div className="metric-item">
                  <div className="metric-label">Sharpe Ratio</div>
                  <div className="metric-value" style={{ color: sentiment.volatilityMetrics.sharpeRatio > 1 ? '#0ECB81' : 
                    sentiment.volatilityMetrics.sharpeRatio > 0.5 ? '#FFA500' : '#F6465D' }}>
                    {sentiment.volatilityMetrics.sharpeRatio.toFixed(2)}
                  </div>
                  <div className="metric-description">
                    {sentiment.volatilityMetrics.sharpeRatio > 1 ? 'Excellent' : 
                     sentiment.volatilityMetrics.sharpeRatio > 0.5 ? 'Good' : 'Poor'} risk-adjusted returns
                  </div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Daily Volatility</div>
                  <div className="metric-value">{sentiment.volatilityMetrics.daily.toFixed(2)}%</div>
                  <div className="metric-description">
                    {sentiment.volatilityMetrics.rank} volatility level
                  </div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Max Drawdown</div>
                  <div className="metric-value" style={{ color: '#F6465D' }}>
                    -{sentiment.volatilityMetrics.maxDrawdown.toFixed(2)}%
                  </div>
                  <div className="metric-description">
                    Worst decline from peak
                  </div>
                </div>
                <div className="metric-item">
                  <div className="metric-label">Data Points</div>
                  <div className="metric-value">{sentiment.volatilityMetrics.dataPoints}</div>
                  <div className="metric-description">
                    Days of historical data
                  </div>
                </div>
              </div>
              {sentiment.volatilityMetrics.dataPoints === 0 && (
                <div className="no-data-warning">
                  <p>⚠️ Sharpe ratio is 0.00 because no historical price data is available.</p>
                  <p>This happens when:</p>
                  <ul>
                    <li>Portfolio positions are newly added</li>
                    <li>Market data API is unavailable</li>
                    <li>Insufficient trading history</li>
                  </ul>
                  <p>The ratio will improve as more data becomes available.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Market Context */}
        {sentiment.marketContext && (
          <div className="insight-card market-context">
            <div className="card-header">
              <h3>Market Context</h3>
              <span className="card-icon">🌍</span>
            </div>
            <div className="card-content">
              <div className="market-benchmarks">
                <h4>Market Benchmarks</h4>
                {sentiment.marketContext.benchmarks && Object.entries(sentiment.marketContext.benchmarks).map(([symbol, data]) => (
                  <div key={symbol} className="benchmark-item">
                    <span className="benchmark-symbol">{symbol}</span>
                    <span className={`benchmark-change ${data.changePercent >= 0 ? 'positive' : 'negative'}`}>
                      {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
              {sentiment.marketContext.marketConditions && (
                <div className="market-conditions">
                  <h4>Market Conditions</h4>
                  <div className="condition-item">
                    <span>Sentiment:</span>
                    <span className={`condition-value ${
                      sentiment.marketContext.marketConditions.sentiment === 'Bullish' ? 'positive' : 
                      sentiment.marketContext.marketConditions.sentiment === 'Bearish' ? 'negative' : 'neutral'
                    }`}>
                      {sentiment.marketContext.marketConditions.sentiment}
                    </span>
                  </div>
                  <div className="condition-item">
                    <span>Volatility:</span>
                    <span className={`condition-value ${
                      sentiment.marketContext.marketConditions.volatility === 'High' ? 'negative' : 
                      sentiment.marketContext.marketConditions.volatility === 'Low' ? 'positive' : 'neutral'
                    }`}>
                      {sentiment.marketContext.marketConditions.volatility}
                    </span>
                  </div>
                  {sentiment.marketContext.marketConditions.breadth && (
                    <div className="condition-item">
                      <span>Market Breadth:</span>
                      <span className={`condition-value ${
                        sentiment.marketContext.marketConditions.breadth.description === 'Strong' ? 'positive' : 
                        sentiment.marketContext.marketConditions.breadth.description === 'Weak' ? 'negative' : 'neutral'
                      }`}>
                        {sentiment.marketContext.marketConditions.breadth.description}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trend Analysis */}
        {sentiment.trendAnalysis && (
          <div className="insight-card trend-analysis">
            <div className="card-header">
              <h3>Trend Analysis</h3>
              <span className="card-icon">📈</span>
            </div>
            <div className="card-content">
              <div className="trend-overall">
                <span className="trend-label">Overall Trend:</span>
                <span className={`trend-value ${
                  sentiment.trendAnalysis.overall.includes('Bullish') ? 'positive' : 
                  sentiment.trendAnalysis.overall.includes('Bearish') ? 'negative' : 'neutral'
                }`}>
                  {sentiment.trendAnalysis.overall}
                </span>
              </div>
              {sentiment.trendAnalysis.trends && (
                <div className="trend-timeframes">
                  <h4>Timeframe Performance</h4>
                  {Object.entries(sentiment.trendAnalysis.trends).map(([timeframe, performance]) => (
                    <div key={timeframe} className="timeframe-item">
                      <span className="timeframe-label">{timeframe.toUpperCase()}:</span>
                      <span className={`timeframe-performance ${performance >= 0 ? 'positive' : 'negative'}`}>
                        {performance >= 0 ? '+' : ''}{performance.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {sentiment.trendAnalysis.momentum && (
                <div className="momentum-info">
                  <span className="momentum-label">Momentum:</span>
                  <span className={`momentum-value ${
                    sentiment.trendAnalysis.momentum.description.includes('Positive') ? 'positive' : 
                    sentiment.trendAnalysis.momentum.description.includes('Negative') ? 'negative' : 'neutral'
                  }`}>
                    {sentiment.trendAnalysis.momentum.description}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Insights Messages */}
      <div className="insights-messages">
        <h3>💡 Key Insights</h3>
        <div className="insights-list">
          {insightMessages.map((insight, index) => (
            <div key={index} className="insight-message">
              <span className="insight-bullet">•</span>
              <span className="insight-text">{insight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {sentiment.recommendations && sentiment.recommendations.length > 0 && (
        <div className="recommendations">
          <h3>🎯 Recommendations</h3>
          <div className="recommendations-list">
            {sentiment.recommendations.map((recommendation, index) => (
              <div key={index} className="recommendation-item">
                <span className="recommendation-icon">💡</span>
                <span className="recommendation-text">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioInsights; 