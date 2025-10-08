# FinTracker Backend

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+

### Installation

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
   Edit `.env` file with your database credentials and other settings.

4. **Setup PostgreSQL database:**
   ```bash
   # Create database
   createdb fintracker_db
   
   # Or using psql
   psql -c "CREATE DATABASE fintracker_db;"
   ```

5. **Run database migrations:**
   ```bash
   npm run migrate
   ```

6. **Seed the database (optional):**
   ```bash
   npm run db:seed
   ```

7. **Start development server:**
   ```bash
   npm run dev
   ```

### 🛠️ Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Watch tests
npm test:watch

# Database operations
npm run migrate          # Run migrations
npm run db:push         # Push schema changes
npm run db:seed         # Seed database
npm run db:studio       # Open Prisma Studio

# Generate Prisma client
npm run generate
```

### 📊 Database Management

- **Prisma Studio**: Visual database editor
  ```bash
  npm run db:studio
  ```

- **View database schema**: Check `prisma/schema.prisma`

### 🔧 Environment Variables

Required variables in `.env`:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://username:password@localhost:5432/fintracker_db"
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
```

### 📡 API Endpoints

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

**Wallets:**
- `GET /api/wallets` - Get user wallets
- `POST /api/wallets` - Create wallet
- `PUT /api/wallets/:id` - Update wallet
- `DELETE /api/wallets/:id` - Delete wallet

**Health Check:**
- `GET /health` - Server health status

### 🔍 Development Tools

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Jest**: Testing framework
- **Nodemon**: Development server with hot reload
- **TypeScript**: Type safety

### 🗄️ Database Schema

Key models:
- **User**: User accounts with preferences
- **Wallet**: Money sources (bank, cash, etc.)
- **Transaction**: Income and expenses
- **Category**: Transaction categorization
- **Reminder**: Payment reminders
- **Goal**: Savings goals

### 🔐 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation

### 📱 Mobile App Integration

The backend is designed to work with the React Native frontend:
- RESTful API design
- JSON responses
- Mobile-optimized endpoints
- Offline-friendly data structure

### 🌐 Internationalization

Supports multiple languages and currencies:
- Languages: English, German, Arabic
- Currencies: USD, EUR, MAD
- Localized API responses
- RTL support for Arabic

### 🚀 Production Deployment

1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secret
4. Enable SSL/HTTPS
5. Configure proper CORS origins
6. Set up monitoring and logging

### 📝 TODO Features

See `BACKEND_TODO.md` for comprehensive feature roadmap including:
- Advanced analytics
- Push notifications  
- Currency conversion
- Data backup/restore
- Performance optimization

### 🤝 Contributing

1. Follow TypeScript best practices
2. Write tests for new features
3. Update API documentation
4. Follow conventional commit messages

### 📞 Support

For issues and questions:
- Check API documentation
- Review error logs
- Use Prisma Studio for database debugging