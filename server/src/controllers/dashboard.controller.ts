import { Request, Response } from 'express';
import { LogRepository } from '../repositories/log.repository.js';
import { CommandStatus } from '@prisma/client';

export class DashboardController {
  static async getStats(_req: Request, res: Response) {
    const stats = await LogRepository.getDashboardStats();
    return res.json({ stats });
  }

  static async getLogs(req: Request, res: Response) {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as CommandStatus | undefined;
    const command = req.query.command as string | undefined;
    const aiOnly = req.query.aiOnly === 'true';

    const result = await LogRepository.getLogs(page, limit, status, command, aiOnly);
    return res.json(result);
  }
}
