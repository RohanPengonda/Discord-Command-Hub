import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file from root or server directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/discord_dashboard?sslmode=disable'),
  JWT_SECRET: z.string().default('super_secret_jwt_key_for_discord_automation_dashboard_32chars'),
  SESSION_SECRET: z.string().default('super_secret_session_key_for_discord_automation_dashboard'),
  DISCORD_APPLICATION_ID: z.string().optional().default('123456789012345678'),
  DISCORD_PUBLIC_KEY: z.string().optional().default('0000000000000000000000000000000000000000000000000000000000000000'),
  DISCORD_BOT_TOKEN: z.string().optional().default(''),
  DISCORD_GUILD_ID: z.string().optional().default(''),
  DISCORD_PRIMARY_CHANNEL_ID: z.string().optional().default(''),
  DISCORD_MIRROR_CHANNEL_ID: z.string().optional().default(''),
  AI_API_KEY: z.string().optional().default(''),
  AI_MODEL: z.string().optional().default('gemini-2.5-flash'),
  BACKEND_URL: z.string().default('http://localhost:5000'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  ALLOW_VERCEL_PREVIEWS: z.string().optional().default('false'),
});

export const env = envSchema.parse(process.env);

export const ALLOWED_ORIGINS: string[] = env.FRONTEND_URL.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Cross-site dashboards (vercel.app -> onrender.com) need SameSite=None; Secure, which requires HTTPS on both.
export const IS_CROSS_ORIGIN = ALLOWED_ORIGINS.some((o) => o.startsWith('https://'));

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_CROSS_ORIGIN || env.NODE_ENV === 'production',
  sameSite: (IS_CROSS_ORIGIN ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const DISCORD_PLACEHOLDER_APP_ID = '123456789012345678';
const DISCORD_PLACEHOLDER_PUBLIC_KEY = '0'.repeat(64);

export const DISCORD_PLACEHOLDER_CHANNEL_ID = '123456789012345678';

// Placeholder defaults let local dev boot, but in production they fail every Ed25519 check and Discord only reports "did not respond".
export function assertProductionDiscordConfig(): void {
  if (env.NODE_ENV !== 'production') return;

  const problems: string[] = [];

  if (!env.DISCORD_APPLICATION_ID || env.DISCORD_APPLICATION_ID === DISCORD_PLACEHOLDER_APP_ID) {
    problems.push('DISCORD_APPLICATION_ID is unset or still the placeholder default');
  }
  if (
    !env.DISCORD_PUBLIC_KEY ||
    env.DISCORD_PUBLIC_KEY === DISCORD_PLACEHOLDER_PUBLIC_KEY ||
    !/^[0-9a-fA-F]{64}$/.test(env.DISCORD_PUBLIC_KEY)
  ) {
    problems.push('DISCORD_PUBLIC_KEY must be 64 hex characters (copy it from the Discord portal)');
  }
  if (!env.DISCORD_BOT_TOKEN) {
    problems.push('DISCORD_BOT_TOKEN is unset');
  }
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    problems.push('JWT_SECRET must be at least 32 characters');
  }
  if (!env.DATABASE_URL) {
    problems.push('DATABASE_URL is unset');
  }

  if (problems.length > 0) {
    throw new Error(`Invalid production configuration:\n  - ${problems.join('\n  - ')}`);
  }
}
