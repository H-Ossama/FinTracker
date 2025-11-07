# Railway Environment Variables Setup Guide

After creating your Neon database with 2nddAccount, add these variables to Railway:

## Required Environment Variables for Railway:

1. NODE_ENV=production
2. PORT=8080  
3. DATABASE_URL=<YOUR_NEW_NEON_DATABASE_URL>
4. JWT_SECRET=fintracker-super-secret-jwt-key-change-this-in-production-2024
5. ALLOWED_ORIGINS=https://finex-production.up.railway.app
6. BCRYPT_ROUNDS=12
7. RATE_LIMIT_WINDOW_MS=900000
8. RATE_LIMIT_MAX_REQUESTS=100

## How to add them to Railway:

1. Go to your Railway dashboard (logged in with 2nddAccount)
2. Select your FinTracker project
3. Click on "Variables" or "Environment Variables" tab
4. Add each variable above with its value

## Important:
- Replace DATABASE_URL with the actual connection string from your new Neon database
- Make sure the DATABASE_URL includes `?sslmode=require` at the end
- The URL should look like: postgresql://user:pass@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require

## After adding variables:
Railway will automatically redeploy your application with the new environment variables.