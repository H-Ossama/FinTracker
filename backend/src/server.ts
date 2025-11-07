import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import walletRoutes from './routes/wallets';
import transactionRoutes from './routes/transactions';
import categoryRoutes from './routes/categories';
import reminderRoutes from './routes/reminders';
import goalRoutes from './routes/goals';
import analyticsRoutes from './routes/analytics';
import notificationRoutes from './routes/notifications';
import recurringTransactionRoutes from './routes/recurringTransactions';
import smartAlertRoutes from './routes/smartAlerts';
import syncRoutes from './routes/sync';
import { PrismaClient } from '@prisma/client';
import { ReminderSchedulerService } from './services/reminderSchedulerService';

// Load environment variables
dotenv.config();

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:19006'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected',
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      database: 'disconnected',
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/recurring-transactions', recurringTransactionRoutes);
app.use('/api/smart-alerts', smartAlertRoutes);
app.use('/api/sync', syncRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'FinTracker API Server',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health',
    timestamp: new Date().toISOString(),
    port: PORT,
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Server is working!',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '3001', 10);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FinTracker Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
  
  // Start reminder scheduler only if database is available
  try {
    const reminderScheduler = ReminderSchedulerService.getInstance();
    reminderScheduler.start(15); // Check every 15 minutes
    console.log(`⏰ Reminder scheduler started`);
  } catch (error) {
    console.log(`⏰ Reminder scheduler skipped - database not ready`);
  }
});

server.on('error', (error: any) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
    default:
      throw error;
  }
});

// Test database connection on startup
async function initializeDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test with a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database query test successful');
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('❌ Server will start but database features will be unavailable');
    return false;
  }
}

// Initialize database when server starts
initializeDatabase();

export default app;