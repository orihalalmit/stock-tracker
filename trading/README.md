# Stock Tracker Application

A modern, real-time stock tracking application built with React and Node.js, integrated with the Alpaca API for live market data.

## Features

- **Real-time Stock Data**: Live stock prices and daily changes from Alpaca API
- **Modern UI**: Beautiful, responsive design with gradient backgrounds and glass-morphism effects
- **Auto-refresh**: Data automatically updates every 30 seconds
- **Stock Metrics**: Current price, daily change, percentage change, volume, high/low, and opening price
- **Visual Indicators**: Color-coded cards and arrows for positive/negative changes
- **Mobile Responsive**: Optimized for all screen sizes

## Tracked Stocks

The application currently tracks these popular stocks:
- AAPL (Apple Inc.)
- GOOGL (Alphabet Inc.)
- MSFT (Microsoft Corporation)
- TSLA (Tesla Inc.)
- AMZN (Amazon.com Inc.)
- NVDA (NVIDIA Corporation)
- META (Meta Platforms Inc.)
- NFLX (Netflix Inc.)

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Alpaca API credentials (already configured)

## Installation

1. **Install dependencies for all packages:**
   ```bash
   npm run install-all
   ```

2. **Start the development servers:**
   ```bash
   npm run dev
   ```

   This will start both the backend server (port 3001) and frontend development server (port 3000).

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. The application will automatically load and display current stock data
3. Data refreshes every 30 seconds automatically
4. Click the "Refresh" button to manually update data
5. Hover over stock cards to see enhanced visual effects

## API Endpoints

The backend provides the following endpoints:

- `GET /api/stocks/snapshots` - Get current stock snapshots with daily changes
- `GET /api/stocks/latest` - Get latest stock quotes
- `GET /api/stocks/bars` - Get daily stock bars (7-day history)
- `GET /api/stocks/list` - Get list of tracked stocks
- `GET /api/health` - Health check endpoint

## Project Structure

```
stock-tracker/
├── backend/
│   ├── server.js          # Express server with Alpaca API integration
│   └── package.json       # Backend dependencies
├── frontend/
│   ├── public/
│   │   └── index.html     # HTML template
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Header.js  # App header with title and refresh
│   │   │   ├── StockCard.js # Individual stock display card
│   │   │   └── LoadingSpinner.js # Loading animation
│   │   ├── App.js         # Main application component
│   │   └── index.js       # React entry point
│   └── package.json       # Frontend dependencies
└── package.json           # Root package.json with scripts
```

## Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Axios** - HTTP client for API requests
- **CORS** - Cross-origin resource sharing

### Frontend
- **React** - UI library
- **CSS3** - Modern styling with flexbox/grid
- **Axios** - HTTP client for API calls

### API Integration
- **Alpaca Markets API** - Real-time and historical stock data

## Styling Features

- **Gradient Backgrounds** - Beautiful color transitions
- **Glass-morphism Effects** - Translucent cards with backdrop blur
- **Hover Animations** - Smooth transitions and micro-interactions
- **Responsive Design** - Mobile-first approach
- **Color-coded Indicators** - Green for gains, red for losses
- **Modern Typography** - Inter font for clean readability

## Development

### Backend Development
```bash
cd backend
npm run dev  # Starts with nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm start    # Starts React development server
```

## Production Deployment

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

## License

This project is licensed under the ISC License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Notes

- The application uses Alpaca's paper trading API endpoint for development
- Stock data is refreshed every 30 seconds automatically
- All prices are displayed in USD
- The application handles API errors gracefully with retry functionality 