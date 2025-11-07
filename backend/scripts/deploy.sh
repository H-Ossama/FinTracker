#!/bin/bash

# FinTracker Backend Deployment Script
echo "🚀 Starting FinTracker Backend Deployment..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Push database schema (creates tables if they don't exist)
echo "🗄️ Setting up database schema..."
npx prisma db push --accept-data-loss

# Check if deployment succeeded
if [ $? -eq 0 ]; then
    echo "✅ Database setup completed successfully!"
    echo "🚀 Starting server..."
    node dist/server.js
else
    echo "❌ Database setup failed!"
    exit 1
fi