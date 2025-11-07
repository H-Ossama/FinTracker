#!/bin/bash

echo "🚀 Starting FinTracker Backend..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📊 Environment: ${NODE_ENV:-production}"
echo "🔗 Port: ${PORT:-3001}"

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Push database schema (create tables if they don't exist)
echo "🗄️  Pushing database schema..."
npx prisma db push --accept-data-loss

# Start the server
echo "🎯 Starting server..."
exec node dist/server.js