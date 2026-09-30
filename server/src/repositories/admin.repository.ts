import { prisma, getDbAvailable } from './prisma.js';
import { logger } from '../utils/logger.js';

const inMemoryAdmins = new Map<string, any>();

export class AdminRepository {
  static async findByEmail(email: string) {
    if (!getDbAvailable()) {
      for (const admin of inMemoryAdmins.values()) {
        if (admin.email === email) return admin;
      }
      return null;
    }

    try {
      return await prisma.adminUser.findUnique({
        where: { email },
      });
    } catch (err: any) {
      logger.warn(`Database unreachable during findByEmail(${email}), using in-memory store fallback`);
      for (const admin of inMemoryAdmins.values()) {
        if (admin.email === email) return admin;
      }
      return null;
    }
  }

  static async findById(id: string) {
    if (!getDbAvailable()) {
      return inMemoryAdmins.get(id) || null;
    }

    try {
      return await prisma.adminUser.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (err: any) {
      return inMemoryAdmins.get(id) || null;
    }
  }

  static async create(data: { email: string; passwordHash: string; name?: string }) {
    const admin = {
      id: 'admin_' + Date.now(),
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name || 'Admin User',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryAdmins.set(admin.id, admin);

    if (!getDbAvailable()) {
      return admin;
    }

    try {
      return await prisma.adminUser.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          name: data.name,
        },
      });
    } catch (err: any) {
      logger.warn('Database connection error while creating admin user, saved in-memory', { error: err.message });
      return admin;
    }
  }

  static async countAdmins() {
    if (!getDbAvailable()) {
      return inMemoryAdmins.size;
    }

    try {
      return await prisma.adminUser.count();
    } catch (err: any) {
      return inMemoryAdmins.size;
    }
  }
}
