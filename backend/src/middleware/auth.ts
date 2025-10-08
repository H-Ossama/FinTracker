import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';
import { createError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        language: string;
        currency: string;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    language: string;
    currency: string;
  };
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Access token required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // Check if session is valid and active
    const session = await prisma.session.findFirst({
      where: {
        token,
        userId: decoded.userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            language: true,
            currency: true,
          },
        },
      },
    });

    if (!session) {
      throw createError('Invalid or expired token', 401);
    }

    req.user = session.user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};