const axios = require('axios');
const AlpacaService = require('./alpacaService');

class SentimentAnalysisService {
  constructor() {
    this.alpacaService = new AlpacaService();
  }

  // Calculate correlation between two arrays
  calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Calculate portfolio beta relative to market
  calculateBeta(portfolioReturns, marketReturns) {
    if (portfolioReturns.length < 2 || marketReturns.length < 2) return 1.0;
    
    const portfolioVariance = this.calculateVariance(portfolioReturns);
    const marketVariance = this.calculateVariance(marketReturns);
    const covariance = this.calculateCovariance(portfolioReturns, marketReturns);
    
    return marketVariance === 0 ? 1.0 : covariance / marketVariance;
  }

  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  calculateCovariance(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const meanX = x.reduce((a, b) => a + b, 0) / x.length;
    const meanY = y.reduce((a, b) => a + b, 0) / y.length;
    
    return x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0) / x.length;
  }

  // Calculate Sharpe ratio (simplified - using daily returns)
  calculateSharpeRatio(returns, riskFreeRate = 0.02) {
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = Math.sqrt(this.calculateVariance(returns));
    
    return volatility === 0 ? 0 : (meanReturn - riskFreeRate / 252) / volatility;
  }

  // Calculate maximum drawdown
  calculateMaxDrawdown(returns) {
    if (returns.length === 0) return 0;
    
    let peak = returns[0];
    let maxDrawdown = 0;
    let runningValue = 1;
    
    for (const ret of returns) {
      runningValue *= (1 + ret / 100);
      if (runningValue > peak) {
        peak = runningValue;
      }
      const drawdown = (peak - runningValue) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown * 100;
  }

  // Fetch market benchmark data
  async fetchMarketBenchmarks() {
    try {
      const benchmarkSymbols = 'SPY,QQQ,VXX,IWM';
      const result = await this.alpacaService.getSnapshots(benchmarkSymbols);
      
      const benchmarks = {};
      Object.entries(result.snapshots).forEach(([symbol, data]) => {
        const currentPrice = data.latestTrade?.p || data.latestQuote?.ap || 0;
        const previousClose = data.prevDailyBar?.c || currentPrice;
        const change = currentPrice - previousClose;
        const changePercent = previousClose > 0 ? ((change / previousClose) * 100) : 0;
        
        benchmarks[symbol] = {
          price: currentPrice,
          change,
          changePercent,
          volume: data.dailyBar?.v || 0
        };
      });
      
      return benchmarks;
    } catch (error) {
      console.error('Error fetching market benchmarks:', error);
      // Return fallback data
      return {
        SPY: { price: 500, change: 0, changePercent: 0, volume: 0 },
        QQQ: { price: 400, change: 0, changePercent: 0, volume: 0 },
        VXX: { price: 25, change: 0, changePercent: 0, volume: 0 },
        IWM: { price: 200, change: 0, changePercent: 0, volume: 0 }
      };
    }
  }

  // Calculate market alignment
  async calculateMarketAlignment(portfolioChangePercent) {
    const benchmarks = await this.fetchMarketBenchmarks();
    
    const spyChange = benchmarks.SPY.changePercent;
    const qqqChange = benchmarks.QQQ.changePercent;
    const vxxChange = benchmarks.VXX.changePercent; // VIX proxy
    
    // Calculate correlation with major indices
    const marketCorrelation = this.calculateCorrelation(
      [portfolioChangePercent],
      [spyChange]
    );
    
    // Determine market alignment
    let alignment = 'Neutral';
    let alignmentScore = 50;
    
    if (Math.abs(marketCorrelation) > 0.7) {
      alignment = marketCorrelation > 0 ? 'Strongly Correlated' : 'Strongly Contrarian';
      alignmentScore = marketCorrelation > 0 ? 80 : 20;
    } else if (Math.abs(marketCorrelation) > 0.3) {
      alignment = marketCorrelation > 0 ? 'Moderately Correlated' : 'Moderately Contrarian';
      alignmentScore = marketCorrelation > 0 ? 65 : 35;
    }
    
    // Analyze market conditions
    const marketConditions = this.analyzeMarketConditions(benchmarks);
    
    return {
      alignment,
      alignmentScore,
      correlation: marketCorrelation,
      benchmarks,
      marketConditions
    };
  }

  // Analyze overall market conditions
  analyzeMarketConditions(benchmarks) {
    const spyChange = benchmarks.SPY.changePercent;
    const qqqChange = benchmarks.QQQ.changePercent;
    const vxxChange = benchmarks.VXX.changePercent;
    
    let marketSentiment = 'Neutral';
    let volatilityLevel = 'Normal';
    
    // Market sentiment based on major indices
    if (spyChange > 1 && qqqChange > 1) {
      marketSentiment = 'Bullish';
    } else if (spyChange < -1 && qqqChange < -1) {
      marketSentiment = 'Bearish';
    }
    
    // Volatility level based on VXX (VIX proxy)
    if (vxxChange > 10) {
      volatilityLevel = 'High';
    } else if (vxxChange > 5) {
      volatilityLevel = 'Elevated';
    } else if (vxxChange < -10) {
      volatilityLevel = 'Low';
    }
    
    return {
      sentiment: marketSentiment,
      volatility: volatilityLevel,
      breadth: this.calculateMarketBreadth(benchmarks)
    };
  }

  // Calculate market breadth
  calculateMarketBreadth(benchmarks) {
    const positiveCount = Object.values(benchmarks).filter(b => b.changePercent > 0).length;
    const totalCount = Object.values(benchmarks).length;
    const breadthRatio = positiveCount / totalCount;
    
    let breadth = 'Neutral';
    if (breadthRatio > 0.7) breadth = 'Strong';
    else if (breadthRatio > 0.5) breadth = 'Positive';
    else if (breadthRatio < 0.3) breadth = 'Weak';
    else if (breadthRatio < 0.5) breadth = 'Negative';
    
    return {
      ratio: breadthRatio,
      description: breadth,
      advancers: positiveCount,
      decliners: totalCount - positiveCount
    };
  }

  // Calculate multi-timeframe trend analysis
  calculateTrendSentiment(historicalData) {
    const trends = {
      short: historicalData['1W']?.changePercentage || 0,
      medium: historicalData['1M']?.changePercentage || 0,
      long: historicalData['3M']?.changePercentage || 0
    };
    
    // Calculate trend score (0-6)
    let trendScore = 0;
    if (trends.short > 0) trendScore += 1;
    if (trends.medium > 0) trendScore += 2;
    if (trends.long > 0) trendScore += 3;
    
    const trendSentiments = {
      0: 'Strongly Bearish',
      1: 'Bearish',
      2: 'Neutral-Bearish',
      3: 'Neutral',
      4: 'Neutral-Bullish',
      5: 'Bullish',
      6: 'Strongly Bullish'
    };
    
    // Calculate momentum
    const momentum = this.calculateMomentum(trends);
    
    return {
      overall: trendSentiments[trendScore],
      score: trendScore,
      trends,
      momentum
    };
  }

  // Calculate momentum indicators
  calculateMomentum(trends) {
    const weights = { short: 0.5, medium: 0.3, long: 0.2 };
    const weightedMomentum = Object.entries(trends).reduce((sum, [period, change]) => {
      return sum + (change * weights[period]);
    }, 0);
    
    let momentum = 'Neutral';
    if (weightedMomentum > 5) momentum = 'Strong Positive';
    else if (weightedMomentum > 2) momentum = 'Positive';
    else if (weightedMomentum < -5) momentum = 'Strong Negative';
    else if (weightedMomentum < -2) momentum = 'Negative';
    
    return {
      value: weightedMomentum,
      description: momentum
    };
  }

  // Fetch historical data for portfolio positions
  async fetchHistoricalReturns(positions, days = 30) {
    try {
      const symbols = positions.map(pos => pos.symbol).join(',');
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
      
      const data = await this.alpacaService.getBars(symbols, '1Day', startDate.toISOString(), endDate.toISOString());
      
      const portfolioReturns = [];
      const bars = data.bars;
      
      // Calculate daily portfolio returns
      if (bars && Object.keys(bars).length > 0) {
        const allDates = new Set();
        Object.values(bars).forEach(symbolBars => {
          symbolBars.forEach(bar => allDates.add(bar.t.split('T')[0]));
        });
        
        const sortedDates = Array.from(allDates).sort();
        
        for (let i = 1; i < sortedDates.length; i++) {
          const currentDate = sortedDates[i];
          const previousDate = sortedDates[i - 1];
          
          let portfolioReturn = 0;
          let totalWeight = 0;
          
          positions.forEach(position => {
            const symbolBars = bars[position.symbol] || [];
            const currentBar = symbolBars.find(bar => bar.t.startsWith(currentDate));
            const previousBar = symbolBars.find(bar => bar.t.startsWith(previousDate));
            
            if (currentBar && previousBar && previousBar.c > 0) {
              const stockReturn = (currentBar.c - previousBar.c) / previousBar.c;
              const weight = position.marketValue / positions.reduce((sum, pos) => sum + pos.marketValue, 0);
              portfolioReturn += stockReturn * weight;
              totalWeight += weight;
            }
          });
          
          if (totalWeight > 0) {
            portfolioReturns.push(portfolioReturn * 100); // Convert to percentage
          }
        }
      }
      
      return portfolioReturns;
    } catch (error) {
      console.error('Error fetching historical returns:', error);
      return [];
    }
  }

  // Calculate advanced volatility metrics
  calculateAdvancedVolatility(positionMetrics, historicalReturns = []) {
    const dailyVolatilities = positionMetrics.map(pos => Math.abs(pos.dailyChangePercent));
    const avgVolatility = dailyVolatilities.reduce((sum, vol) => sum + vol, 0) / dailyVolatilities.length;
    
    // Calculate rolling volatility if historical data available
    const rollingVolatility = historicalReturns.length > 0 ? 
      Math.sqrt(this.calculateVariance(historicalReturns)) * Math.sqrt(252) : avgVolatility;
    
    // Beta calculation (simplified)
    const beta = 1.0; // Would need market data for accurate calculation
    
    // Sharpe ratio calculation with actual historical data
    const sharpeRatio = this.calculateSharpeRatio(historicalReturns);
    
    // Max drawdown
    const maxDrawdown = this.calculateMaxDrawdown(historicalReturns);
    
    // Volatility ranking
    let volatilityRank = 'Medium';
    if (avgVolatility > 8) volatilityRank = 'Very High';
    else if (avgVolatility > 5) volatilityRank = 'High';
    else if (avgVolatility > 2) volatilityRank = 'Medium';
    else if (avgVolatility > 1) volatilityRank = 'Low';
    else volatilityRank = 'Very Low';
    
    return {
      daily: avgVolatility,
      rolling: rollingVolatility,
      beta,
      sharpeRatio,
      maxDrawdown,
      rank: volatilityRank,
      riskAdjustedReturn: sharpeRatio > 0 ? sharpeRatio * 100 : 0,
      dataPoints: historicalReturns.length
    };
  }

  // Normalize values to 0-100 scale
  normalizeValue(value, min, max) {
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }

  // Calculate comprehensive sentiment score
  async calculateSentimentScore(portfolioMetrics, historicalData) {
    const marketAlignment = await this.calculateMarketAlignment(portfolioMetrics.totalDailyChangePercent);
    const trendSentiment = this.calculateTrendSentiment(historicalData);
    
    // Fetch actual historical returns for better calculations
    const historicalReturns = await this.fetchHistoricalReturns(portfolioMetrics.positions || []);
    const volatilityMetrics = this.calculateAdvancedVolatility(portfolioMetrics.positionMetrics, historicalReturns);
    
    // Component scores (0-100)
    const components = {
      performance: {
        weight: 0.3,
        score: this.normalizeValue(portfolioMetrics.totalDailyChangePercent, -10, 10) + 50,
        description: 'Daily Performance'
      },
      volatility: {
        weight: 0.2,
        score: 100 - this.normalizeValue(volatilityMetrics.daily, 0, 15), // Lower volatility = higher score
        description: 'Volatility (Risk)'
      },
      marketAlignment: {
        weight: 0.25,
        score: marketAlignment.alignmentScore,
        description: 'Market Alignment'
      },
      trend: {
        weight: 0.15,
        score: (trendSentiment.score / 6) * 100,
        description: 'Multi-Timeframe Trend'
      },
      diversification: {
        weight: 0.1,
        score: this.calculateDiversificationScore(portfolioMetrics.sectorPerformance),
        description: 'Portfolio Diversification'
      }
    };
    
    // Calculate weighted score
    const weightedScore = Object.values(components).reduce((sum, comp) => 
      sum + (comp.score * comp.weight), 0
    );
    
    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(components, portfolioMetrics);
    
    // Determine overall sentiment
    const overallSentiment = this.getSentimentFromScore(weightedScore);
    
    return {
      score: Math.round(weightedScore),
      overall: overallSentiment,
      confidence,
      breakdown: components,
      marketAlignment,
      trendSentiment,
      volatilityMetrics
    };
  }

  // Calculate diversification score
  calculateDiversificationScore(sectorPerformance) {
    const sectors = Object.keys(sectorPerformance);
    const sectorCount = sectors.length;
    
    // Base score on number of sectors
    let baseScore = Math.min(sectorCount * 15, 70); // Max 70 for sector count
    
    // Add score for balanced allocation
    const weights = sectors.map(sector => sectorPerformance[sector].portfolioWeight);
    const maxWeight = Math.max(...weights);
    const concentration = maxWeight / 100;
    
    // Penalty for high concentration
    const concentrationPenalty = concentration > 0.5 ? (concentration - 0.5) * 60 : 0;
    
    return Math.max(0, baseScore - concentrationPenalty);
  }

  // Calculate confidence in sentiment prediction
  calculateConfidence(components, portfolioMetrics) {
    let confidence = 0.8; // Base confidence
    
    // Reduce confidence for small portfolios
    if (portfolioMetrics.positionCount < 5) {
      confidence -= 0.2;
    }
    
    // Reduce confidence for high volatility
    if (components.volatility.score < 30) {
      confidence -= 0.1;
    }
    
    // Increase confidence for consistent trends
    if (components.trend.score > 70 || components.trend.score < 30) {
      confidence += 0.1;
    }
    
    return Math.max(0.3, Math.min(1.0, confidence));
  }

  // Convert sentiment score to descriptive text
  getSentimentFromScore(score) {
    if (score >= 80) return 'Very Bullish';
    if (score >= 65) return 'Bullish';
    if (score >= 55) return 'Moderately Bullish';
    if (score >= 45) return 'Neutral';
    if (score >= 35) return 'Moderately Bearish';
    if (score >= 20) return 'Bearish';
    return 'Very Bearish';
  }

  // Generate enhanced recommendations
  generateEnhancedRecommendations(sentimentData, portfolioMetrics) {
    const recommendations = [];
    const { score, breakdown, marketAlignment, volatilityMetrics } = sentimentData;
    
    // Performance-based recommendations
    if (breakdown.performance.score < 40) {
      recommendations.push('Consider reviewing underperforming positions for potential rebalancing');
    }
    
    // Volatility-based recommendations
    if (volatilityMetrics.daily > 5) {
      recommendations.push('High volatility detected - consider adding defensive positions or reducing position sizes');
    }
    
    if (volatilityMetrics.sharpeRatio < 0.5) {
      recommendations.push('Risk-adjusted returns are low - focus on quality stocks with better risk/reward profiles');
    }
    
    // Market alignment recommendations
    if (marketAlignment.correlation < -0.5) {
      recommendations.push('Portfolio is moving against market trends - verify if this contrarian position is intentional');
    }
    
    // Diversification recommendations
    if (breakdown.diversification.score < 50) {
      recommendations.push('Consider diversifying across more sectors to reduce concentration risk');
    }
    
    // Trend-based recommendations
    if (breakdown.trend.score < 30) {
      recommendations.push('Multiple timeframes showing weakness - consider defensive positioning');
    } else if (breakdown.trend.score > 70) {
      recommendations.push('Strong trends across timeframes - consider taking some profits if positions are overvalued');
    }
    
    // Market condition recommendations
    if (marketAlignment.marketConditions.volatility === 'High') {
      recommendations.push('High market volatility - consider reducing leverage and maintaining higher cash positions');
    }
    
    return recommendations;
  }
}

module.exports = SentimentAnalysisService; 