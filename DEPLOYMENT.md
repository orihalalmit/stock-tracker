# Deployment Guide

## Environment Variables Required

When deploying to Railway, you need to set these environment variables:

### Alpaca API Configuration
- `ALPACA_API_KEY` - Your Alpaca API key
- `ALPACA_SECRET_KEY` - Your Alpaca secret key  
- `ALPACA_BASE_URL` - Set to `https://paper-api.alpaca.markets/v2` for paper trading

### Database Configuration
- `MONGODB_URI` - MongoDB connection string (Railway will provide this automatically)

### Server Configuration
- `PORT` - Will be set automatically by Railway
- `NODE_ENV` - Set to `production`

## Railway Deployment Steps

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose `orihalalmit/stock-tracker`
6. Railway will automatically detect the project and start building

## Post-Deployment Configuration

After deployment:
1. Add a MongoDB database service in Railway
2. Set the required environment variables in Railway dashboard
3. Your app will be accessible at the Railway-provided URL

## Build Process

Railway will automatically:
1. Install dependencies for both frontend and backend
2. Build the React frontend
3. Start the Node.js backend server
4. Serve the built React app from the backend 