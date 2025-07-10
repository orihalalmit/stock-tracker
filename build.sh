#!/bin/bash
set -e

echo "Installing backend dependencies..."
cd trading/backend
npm install

echo "Installing frontend dependencies..."
cd ../frontend
npm install

echo "Building frontend..."
npm run build

echo "Build completed successfully!" 