import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { UserRole } from '@bind-build/shared';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { authenticate, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['PRINCIPAL', 'SALES', 'ADMIN']).optional(),
});

// POST /api/auth/register
authRouter.post('/register', async (req, res: Response) => {
  const body = RegisterSchema.parse(req.body);
  const hashed = await bcrypt.hash(body.password, 12);
  const initials = body.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      password: hashed,
      name: body.name,
      role: body.role ?? 'SALES',
      initials,
    },
    select: { id: true, email: true, name: true, role: true, avatar: true, initials: true, createdAt: true, updatedAt: true },
  });

  const payload = { userId: user.id, email: user.email, role: user.role as UserRole };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
});

// POST /api/auth/login
authRouter.post('/login', async (req, res: Response) => {
  const body = LoginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(body.password, user.password);
  if (!valid) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  const payload = { userId: user.id, email: user.email, role: user.role as UserRole };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  const { password: _, ...safeUser } = user;
  res.json({ success: true, data: { user: safeUser, accessToken, refreshToken } });
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(401).json({ success: false, error: 'No refresh token' });
    return;
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) {
    res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    return;
  }

  const payload = verifyRefreshToken(refreshToken);
  const newAccessToken = signAccessToken({ userId: payload.userId, email: payload.email, role: payload.role });

  res.json({ success: true, data: { accessToken: newAccessToken } });
});

// POST /api/auth/logout
authRouter.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, role: true, avatar: true, initials: true, createdAt: true, updatedAt: true },
  });
  res.json({ success: true, data: user });
});

// PATCH /api/auth/profile
authRouter.patch('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  const body = z.object({
    name: z.string().min(2).optional(),
    initials: z.string().min(1).max(3).optional(),
    avatar: z.string().url().optional(),
  }).parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: body,
    select: { id: true, email: true, name: true, role: true, avatar: true, initials: true, createdAt: true, updatedAt: true },
  });
  res.json({ success: true, data: user });
});

// PATCH /api/auth/password
authRouter.patch('/password', authenticate, async (req: AuthRequest, res: Response) => {
  const body = z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8),
  }).parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

  const valid = await bcrypt.compare(body.currentPassword, user.password);
  if (!valid) {
    res.status(401).json({ success: false, error: 'Current password is incorrect' });
    return;
  }

  const hashed = await bcrypt.hash(body.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  res.json({ success: true, message: 'Password changed successfully' });
});

// GET /api/auth/team  — list all users (authenticated)
authRouter.get('/team', authenticate, async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true,
      avatar: true, initials: true, createdAt: true,
      _count: { select: { ownedLeads: true } },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });
  res.json({ success: true, data: users });
});

// PATCH /api/auth/team/:id  — update another user's role (Principal only)
authRouter.patch('/team/:id', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'PRINCIPAL' && req.user!.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: 'Insufficient permissions' }); return;
  }
  const body = z.object({
    role: z.enum(['PRINCIPAL', 'SALES', 'ADMIN']).optional(),
    name: z.string().min(2).optional(),
  }).parse(req.body);

  const updated = await prisma.user.update({
    where: { id: req.params['id'] },
    data: body,
    select: { id: true, email: true, name: true, role: true, initials: true, createdAt: true },
  });
  res.json({ success: true, data: updated });
});

