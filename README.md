# Stock Tracker with Portfolio Insights

A comprehensive stock tracking application with portfolio management and intelligent daily insights.

## Features

### 📊 Market Overview
- Real-time stock prices and market data
- Major indices and ETFs tracking
- Volatility indicators
- Cryptocurrency prices
- USD/ILS exchange rates

### 💼 Portfolio Management
- Multiple portfolio support
- Position tracking and management
- CSV import functionality
- Transaction history
- Real-time portfolio valuation
- Historical performance analysis

### 💡 Portfolio Insights (NEW!)
- **Daily Performance Summary**: Track your portfolio's daily gains/losses with detailed breakdowns
- **Market Sentiment Analysis**: Get intelligent sentiment analysis based on your portfolio's performance
- **Top Movers**: Identify your best and worst performing stocks each day
- **Sector Analysis**: See how different sectors in your portfolio are performing
- **Smart Recommendations**: Receive personalized recommendations based on your portfolio's risk profile and performance
- **Risk Assessment**: Monitor your portfolio's volatility and risk levels

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (for portfolio data storage)
- Alpaca API key (for real-time market data)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   - Create `.env` file in `trading/backend/` with your Alpaca API credentials
   - Configure MongoDB connection string

4. Start the application:
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start individually
   npm run start:backend  # Backend on port 3001
   npm run start:frontend # Frontend on port 3000
   ```

## How to Use Portfolio Insights

1. **Navigate to Portfolio Insights**: After setting up your portfolio, click on the "Portfolio Insights" tab in the main navigation.

2. **Daily Performance**: View your portfolio's daily performance with color-coded indicators showing gains/losses.

3. **Market Sentiment**: Check the sentiment analysis that considers:
   - Overall portfolio direction (Bullish/Bearish/Neutral)
   - Risk level assessment (Low/Medium/High)
   - Volatility measurements

4. **Top Movers**: Quickly identify which stocks are driving your portfolio's performance.

5. **Sector Breakdown**: Understand how different sectors contribute to your portfolio's performance.

6. **Key Insights**: Read AI-generated insights about your portfolio's performance and trends.

7. **Recommendations**: Get personalized recommendations for portfolio optimization.

## API Endpoints

### Portfolio Insights
- `GET /api/portfolio/:id/insights` - Get comprehensive portfolio insights including daily summary, sentiment analysis, and recommendations.

## Technology Stack

- **Frontend**: React, CSS3, Axios
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Market Data**: Alpaca API
- **Styling**: Modern CSS with dark theme and glassmorphism effects

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License. 