import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { existsSync } from 'fs';
import path from 'path';

import { env, ALLOWED_ORIGINS, IS_CROSS_ORIGIN } from './config/env.js';
import { requestLogger } from './middleware/request_logger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { logger } from './utils/logger.js';

import authRoutes from './routes/auth.routes.js';
import discordRoutes from './routes/discord.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import commandRoutes from './routes/command.routes.js';
import serverRoutes from './routes/server.routes.js';

const app = express();

// Security Headers
app.use(helmet());

// Render/Vercel sit behind a reverse proxy. Without this, express-rate-limit
// keys every request to the proxy IP, so one shared counter throttles all users
// and Discord. Trust exactly one hop.
app.set('trust proxy', 1);

const LOCAL_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const ALLOW_VERCEL_PREVIEWS = env.ALLOW_VERCEL_PREVIEWS === 'true';

const isAllowedOrigin = (origin: string): boolean => {
  if ([...ALLOWED_ORIGINS, ...LOCAL_ORIGINS].includes(origin)) return true;
  if (!ALLOW_VERCEL_PREVIEWS) return false;
  try {
    return new URL(origin).hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header = non-browser client (curl, Discord, uptime checks).
      if (!origin) return callback(null, true);
      return callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Signature-Ed25519', 'X-Signature-Timestamp'],
  })
);

if (IS_CROSS_ORIGIN) {
  logger.warn(
    'FRONTEND_URL is HTTPS and differs from the API origin; admin cookies use SameSite=None; Secure. Both sites MUST be served over HTTPS.'
  );
}

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Cookie Parser
app.use(cookieParser());

// Express Raw Body capture for Discord Ed25519 signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
  app.use(requestLogger);
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
    service: 'discord-automation-backend',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/discord', discordRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/commands', commandRoutes);
app.use('/api/servers', serverRoutes);

// Static frontend serving in production if built together.
// Only enable when the client bundle actually exists next to the server; on a
// split deploy (Vercel frontend + Render backend) it does not, and the catch-all
// below would turn every unknown path into a 500.
const clientBuildPath = path.resolve(process.cwd(), '../client/dist');
if (env.NODE_ENV === 'production' && existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.resolve(clientBuildPath, 'index.html'));
  });
}

// Central Error Handler
app.use(errorHandler as any);

export default app;
