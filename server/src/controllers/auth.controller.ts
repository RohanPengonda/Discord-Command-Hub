import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AdminRepository } from '../repositories/admin.repository.js';
import { env, ADMIN_COOKIE_OPTIONS } from '../config/env.js';
import { AdminAuthRequest } from '../middleware/auth.middleware.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

export class AuthController {
  static async login(req: Request, res: Response) {
    const { email, password } = loginSchema.parse(req.body);

    let admin = await AdminRepository.findByEmail(email);

    // If no admin exists in DB, seed the first admin user automatically on valid login
    if (!admin) {
      const adminCount = await AdminRepository.countAdmins();
      if (adminCount === 0) {
        const passwordHash = await bcrypt.hash(password, 10);
        admin = await AdminRepository.create({ email, passwordHash, name: 'Initial Admin' });
      } else {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    } else {
      const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('admin_token', token, ADMIN_COOKIE_OPTIONS);

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  }

  static async register(req: Request, res: Response) {
    const { email, password, name } = registerSchema.parse(req.body);

    const existing = await AdminRepository.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Admin with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await AdminRepository.create({ email, passwordHash, name });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('admin_token', token, ADMIN_COOKIE_OPTIONS);

    return res.status(201).json({
      message: 'Admin registered successfully',
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  }

  static async logout(_req: Request, res: Response) {
    res.clearCookie('admin_token');
    return res.json({ message: 'Logout successful' });
  }

  static async me(req: AdminAuthRequest, res: Response) {
    if (!req.admin) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const admin = await AdminRepository.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    return res.json({ user: admin });
  }
}
