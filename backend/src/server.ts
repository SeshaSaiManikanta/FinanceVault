// VaultFinance API Server
// © 2025 VaultFinance. All Rights Reserved.
// PROPRIETARY AND CONFIDENTIAL

import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import loanRoutes from './routes/loans';
import applicationRoutes from './routes/applications';
import repaymentRoutes from './routes/repayments';
import dashboardRoutes from './routes/dashboard';
import notificationRoutes from './routes/notifications';
import auditRoutes from './routes/audit';
import settingsRoutes from './routes/settings';
import adminRoutes from './routes/admin';
import paymentRoutes from './routes/payments';
import { logger } from './utils/logger';
import { startScheduler } from './services/scheduledJobs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ─── TRUST PROXY (for Render, Vercel, etc.) ───
app.set('trust proxy', 1);

// ─── SECURITY HEADERS (Helmet) ───
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xFrameOptions: { action: 'deny' },
}));

// ─── CORS ───
app.use(cors({
  origin: [CLIENT_URL, ...(process.env.ALLOWED_ORIGINS?.split(',') || [])],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count'],
}));

// ─── GLOBAL RATE LIMITING ───
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  skip: (req) => req.path === '/api/health',
});
app.use(globalLimiter);

// ─── BODY PARSING ───
app.use(express.json({ limit: '10kb' })); // limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(compression());

// ─── LOGGING ───
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
    skip: (req) => req.path === '/api/health',
  }));
}
app.use(requestLogger);

// ─── HEALTH CHECK ───
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VaultFinance API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── ROUTES ───
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/repayments', repaymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// ─── 404 HANDLER ───
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── GLOBAL ERROR HANDLER ───
app.use(errorHandler);

// ─── START SERVER ───
app.listen(PORT, () => {
  logger.info(`🚀 VaultFinance API running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔒 Security: Helmet + Rate limiting + CORS active`);
  startScheduler();
});

export default app;
