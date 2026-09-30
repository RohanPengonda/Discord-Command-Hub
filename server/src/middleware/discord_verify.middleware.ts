import { Request, Response, NextFunction } from 'express';
import { verifyKey } from 'discord-interactions';
import nacl from 'tweetnacl';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface AuthenticatedDiscordRequest extends Request {
  rawBody?: Buffer;
}

export const verifyDiscordSignature = async (
  req: AuthenticatedDiscordRequest,
  res: Response,
  next: NextFunction
) => {
  // Allow bypassing signature verification ONLY in test mode when explicit mock flag is set
  if (process.env.NODE_ENV === 'test' && req.headers['x-bypass-signature'] === 'true') {
    return next();
  }

  const signature = req.headers['x-signature-ed25519'] as string;
  const timestamp = req.headers['x-signature-timestamp'] as string;

  if (!signature || !timestamp) {
    logger.warn('Discord signature verification failed: Missing required signature or timestamp headers');
    return res.status(401).json({ error: 'Missing required signature or timestamp headers' });
  }

  // 1. Replay attack prevention: verify timestamp freshness (< 5 minutes / 300 seconds)
  if (process.env.NODE_ENV !== 'test') {
    const now = Math.floor(Date.now() / 1000);
    const reqTimestamp = parseInt(timestamp, 10);
    if (isNaN(reqTimestamp) || Math.abs(now - reqTimestamp) > 300) {
      logger.warn(`Discord signature verification failed: Timestamp out of bounds [${timestamp}]`);
      return res.status(401).json({ error: 'Request timestamp is out of bounds (Replay Attack Prevention)' });
    }
  }

  const clientPublicKey = env.DISCORD_PUBLIC_KEY;
  if (!clientPublicKey || clientPublicKey === '0000000000000000000000000000000000000000000000000000000000000000') {
    logger.warn('DISCORD_PUBLIC_KEY is not configured properly in environment variables');
  }

  // Obtain raw body buffer
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

  try {
    // 2. Try discord-interactions helper function (await if async)
    const isValid = await verifyKey(rawBody, signature, timestamp, clientPublicKey);

    if (isValid) {
      return next();
    }

    // 3. Fallback check using nacl directly for extra security & robustness
    const isNaclValid = nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody.toString('utf-8')),
      Buffer.from(signature, 'hex'),
      Buffer.from(clientPublicKey, 'hex')
    );

    if (isNaclValid) {
      return next();
    }

    logger.warn('Discord signature verification failed: Invalid Ed25519 signature');
    return res.status(401).json({ error: 'Invalid request signature' });
  } catch (err: any) {
    logger.error('Error during Discord signature verification', { error: err.message });
    return res.status(401).json({ error: 'Failed to verify request signature' });
  }
};
