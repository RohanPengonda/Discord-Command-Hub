import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface AdminAuthRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateAdmin = (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token = req.cookies?.admin_token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Authentication token required' });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };

    req.admin = decoded;
    return next();
  } catch (err: any) {
    logger.warn('Failed admin authentication attempt', { error: err.message });
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token' });
  }
};
