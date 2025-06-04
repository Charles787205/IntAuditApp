#!/bin/bash

# Navigate to the project directory
cd "$(dirname "$0")"

echo "🚀 Starting IntAudit App..."

# Set the DATABASE_URL environment variable
export DATABASE_URL="file:./prisma/intdb.db"

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate Prisma client if needed
echo "🔧 Setting up database..."
npx prisma generate

# Start the application in development mode
echo "✅ Launching application in development mode..."
npm run electron-dev