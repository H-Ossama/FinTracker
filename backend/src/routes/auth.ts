import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '../server';
import { createError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('language').optional().isIn(['EN', 'DE', 'AR']),
  body('currency').optional().isIn(['USD', 'EUR', 'MAD']),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const { email, password, firstName, lastName, language = 'EN', currency = 'USD' } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw createError('User with this email already exists', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        language: language as any,
        currency: currency as any,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        language: true,
        currency: true,
        createdAt: true,
      },
    });

    // Create default categories
    const defaultCategories = [
      { name: 'Food & Dining', icon: 'restaurant', color: '#FF6B6B' },
      { name: 'Shopping', icon: 'shopping-bag', color: '#4ECDC4' },
      { name: 'Transportation', icon: 'car', color: '#45B7D1' },
      { name: 'Bills & Utilities', icon: 'receipt', color: '#96CEB4' },
      { name: 'Entertainment', icon: 'tv', color: '#FFEAA7' },
      { name: 'Healthcare', icon: 'medical', color: '#DDA0DD' },
      { name: 'Education', icon: 'school', color: '#98D8C8' },
      { name: 'Salary', icon: 'cash', color: '#6C5CE7' },
      { name: 'Business', icon: 'briefcase', color: '#A29BFE' },
      { name: 'Investment', icon: 'trending-up', color: '#FD79A8' },
    ];

    await prisma.category.createMany({
      data: defaultCategories.map(cat => ({
        ...cat,
        userId: user.id,
        isCustom: false,
      })),
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
      message: 'User registered successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        language: true,
        currency: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw createError('Invalid email or password', 401);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw createError('Invalid email or password', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Deactivate session
      await prisma.session.updateMany({
        where: { token },
        data: { isActive: false },
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;