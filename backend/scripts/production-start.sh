#!/bin/bash

# FinTracker Production Setup Script
echo "🚀 Starting FinTracker Production Setup..."

# Set production environment
export NODE_ENV=production

# Generate Prisma Client first
echo "📦 Generating Prisma Client..."
npx prisma generate

# Check if database tables exist
echo "🔍 Checking database status..."
if npx prisma db pull --silent 2>/dev/null; then
    echo "📋 Database schema detected, updating..."
    npx prisma db push --accept-data-loss
else
    echo "🗄️ No existing schema found, creating fresh database..."
    npx prisma db push --accept-data-loss --force-reset
fi

# Verify database setup
echo "✅ Verifying database setup..."
if npx prisma db pull --silent 2>/dev/null; then
    echo "✅ Database setup completed successfully!"
    echo "🚀 Starting FinTracker Backend Server..."
    node dist/server.js
else
    echo "❌ Database setup verification failed!"
    exit 1
fi