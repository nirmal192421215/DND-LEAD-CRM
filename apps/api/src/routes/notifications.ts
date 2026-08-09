import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

// GET /api/notifications  (current user's notifications)
notificationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: req.user!.userId, read: false },
  });
  res.json({ success: true, data: { notifications, unreadCount } });
});

// PATCH /api/notifications/:id/read
notificationsRouter.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  await prisma.notification.update({
    where: { id: req.params['id'], userId: req.user!.userId },
    data: { read: true },
  });
  res.json({ success: true });
});

// PATCH /api/notifications/read-all
notificationsRouter.patch('/read-all', async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, read: false },
    data: { read: true },
  });
  res.json({ success: true });
});

// DELETE /api/notifications/:id
notificationsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.notification.delete({
    where: { id: req.params['id'], userId: req.user!.userId },
  });
  res.json({ success: true });
});

// POST /api/notifications  (internal: create a notification for a user)
notificationsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { userId, type, title, body, leadId } = req.body;
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, leadId },
  });
  res.status(201).json({ success: true, data: notification });
});

// ── Helpers ──────────────────────────────────────────────────────────────────
// These are called from other routes to auto-create notifications
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  leadId?: string
) {
  try {
    await prisma.notification.create({ data: { userId, type, title, body, leadId } });
  } catch { /* non-critical — don't fail parent operation */ }
}
