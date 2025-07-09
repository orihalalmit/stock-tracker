#!/bin/bash

echo "🔍 Finding and killing existing npm processes..."

# Kill any existing npm/node processes for our project
pkill -f "node.*trading/backend" || true
pkill -f "node.*trading/frontend" || true

# Wait a moment to ensure processes are killed
sleep 2

# Store the base directory
BASE_DIR="$(pwd)"

echo "🚀 Starting backend server..."
cd "${BASE_DIR}/trading/backend"
npm install
npm start &

echo "🚀 Starting frontend server..."
cd "${BASE_DIR}/trading/frontend"
npm install
npm start &

echo "✨ Servers restarted successfully!"
echo "Backend running on port 3001"
echo "Frontend running on port 3000"

# Return to original directory
cd "${BASE_DIR}" 