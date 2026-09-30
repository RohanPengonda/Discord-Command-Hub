import { Request, Response } from 'express';
import { ConfigRepository } from '../repositories/config.repository.js';
import { z } from 'zod';

const updateConfigSchema = z.object({
  enabled: z.boolean().optional(),
  saveLogs: z.boolean().optional(),
  replyInDiscord: z.boolean().optional(),
  mirrorNotification: z.boolean().optional(),
  aiProcessing: z.boolean().optional(),
  primaryChannelId: z.string().nullable().optional(),
  mirrorChannelId: z.string().nullable().optional(),
});

export class CommandController {
  static async getAllConfigs(_req: Request, res: Response) {
    const configs = await ConfigRepository.getAllConfigs();
    return res.json({ configs });
  }

  static async updateConfig(req: Request, res: Response) {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = updateConfigSchema.parse(req.body);

    const updated = await ConfigRepository.updateConfig(id, body);
    return res.json({ message: 'Command configuration updated', config: updated });
  }
}
