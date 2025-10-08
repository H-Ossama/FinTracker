# FinTracker Backend Setup Guide

## 🚀 Complete Setup Instructions

### 1. Prerequisites

**Required Software:**
- Node.js 18+ and npm
- PostgreSQL 12+ (or use Docker)

### 2. Database Setup

**Option A: Local PostgreSQL Installation**
1. Install PostgreSQL from https://www.postgresql.org/download/
2. Create a database:
   ```bash
   createdb fintracker_db
   ```
   Or using psql:
   ```sql
   CREATE DATABASE fintracker_db;
   ```

**Option B: Docker PostgreSQL (Recommended)**
```bash
# Run PostgreSQL in Docker
docker run --name fintracker-postgres \
  -e POSTGRES_DB=fintracker_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

# Check if container is running
docker ps
```

### 3. Backend Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/fintracker_db?schema=public"
   JWT_SECRET=your-secret-key-here
   NODE_ENV=development
   PORT=3001
   ```

4. **Generate Prisma client:**
   ```bash
   npm run generate
   ```

5. **Run database migrations:**
   ```bash
   npm run migrate
   ```

6. **Seed the database:**
   ```bash
   npm run db:seed
   ```

7. **Build and start the server:**
   ```bash
   npm run build
   npm start
   ```

### 4. Development Commands

```bash
# Start development server (with hot reload)
npm run dev              # Requires ts-node

# Build TypeScript
npm run build

# Start production server
npm start

# Database operations
npm run migrate          # Run migrations
npm run db:push         # Push schema changes
npm run db:seed         # Seed database
npm run db:studio       # Open Prisma Studio
npm run generate        # Generate Prisma client

# Testing
npm test                # Run tests
npm run test:watch      # Watch tests
```

### 5. Verify Installation

1. **Check server health:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Expected response:**
   ```json
   {
     "status": "OK",
     "timestamp": "2024-10-08T00:00:00.000Z",
     "environment": "development",
     "version": "1.0.0"
   }
   ```

3. **Test API endpoints:**
   ```bash
   # Register a new user
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123",
       "firstName": "Test",
       "lastName": "User"
     }'
   ```

### 6. API Documentation

**Base URL:** `http://localhost:3001`

**Authentication Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

**Wallet Endpoints:**
- `GET /api/wallets` - Get user wallets
- `POST /api/wallets` - Create new wallet
- `PUT /api/wallets/:id` - Update wallet
- `DELETE /api/wallets/:id` - Delete wallet

**Other Endpoints:**
- `GET /health` - Health check
- `GET /api/categories` - Get categories
- `GET /api/transactions` - Get transactions
- `GET /api/analytics/spending` - Get analytics

### 7. Database Schema

Key tables created:
- `users` - User accounts
- `wallets` - Money sources
- `transactions` - Income/expenses
- `categories` - Transaction categories
- `reminders` - Payment reminders
- `goals` - Savings goals
- `sessions` - User sessions

### 8. Troubleshooting

**Common Issues:**

1. **Port already in use:**
   ```bash
   # Kill process on port 3001
   npx kill-port 3001
   ```

2. **Database connection error:**
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Check firewall settings

3. **Migration errors:**
   ```bash
   # Reset database (development only)
   npx prisma migrate reset
   npm run db:seed
   ```

4. **TypeScript errors:**
   ```bash
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

5. **Prisma client issues:**
   ```bash
   # Regenerate Prisma client
   npm run generate
   ```

### 9. Development Tips

- Use Prisma Studio for database visualization: `npm run db:studio`
- Check logs in console for debugging
- Use environment variables for all secrets
- Test endpoints with Postman or curl
- Monitor database queries in development

### 10. Next Steps

1. **Frontend Integration:**
   - Update React Native app to use `http://localhost:3001`
   - Implement authentication flow
   - Connect wallet and transaction features

2. **Feature Development:**
   - Complete transaction endpoints
   - Add analytics endpoints
   - Implement reminder system
   - Add goal tracking

3. **Production Deployment:**
   - Set up production database
   - Configure environment variables
   - Set up monitoring and logging
   - Deploy to cloud provider

## 🎯 Success Criteria

✅ Server starts on port 3001  
✅ Database connection established  
✅ Health check returns OK  
✅ User registration works  
✅ JWT authentication functional  
✅ Basic CRUD operations working  

Ready to start building your financial tracking backend! 🚀