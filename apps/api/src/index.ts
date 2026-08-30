import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { startMeetingReminderCron } from './lib/meetingReminders';

import { authRouter } from './routes/auth';
import { leadsRouter, alignSerialNumbers } from './routes/leads';
import { activitiesRouter } from './routes/activities';
import { notesRouter } from './routes/notes';
import { meetingsRouter } from './routes/meetings';
import { filesRouter } from './routes/files';
import { analyticsRouter } from './routes/analytics';
import { proposalsRouter } from './routes/proposals';
import { notificationsRouter } from './routes/notifications';
import { searchRouter } from './routes/search';
import { aiRouter } from './routes/ai';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ?? 4000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    const allowed = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim());
    if (process.env.CORS_ORIGIN === '*' || allowed.includes(origin) || allowed.some(a => a && origin.endsWith(a))) {
      return callback(null, true);
    }
    // Allow vercel, render, railway, and fly domains by default if not strictly overridden
    if (!process.env.CORS_ORIGIN || origin.includes('vercel.app') || origin.includes('onrender.com') || origin.includes('railway.app')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (dev-friendly)
if (process.env.NODE_ENV !== 'test') {
  app.use((req, _res, next) => {
    const ts = new Date().toISOString().slice(11, 23);
    console.log(`[${ts}] ${req.method.padEnd(6)} ${req.path}`);
    next();
  });
}

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'DND Studio CRM API' });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/notes', notesRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/files', filesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/search', searchRouter);
app.use('/api/ai', aiRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`🚀 DND Studio CRM API running at http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  startMeetingReminderCron();
  await alignSerialNumbers();
});

export default app;
