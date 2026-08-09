import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const activitiesRouter = Router();
activitiesRouter.use(authenticate);

const CreateActivitySchema = z.object({
  leadId: z.string(),
  type: z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'NOTE', 'MEETING', 'STAGE_CHANGE', 'FILE']),
  text: z.string().optional(),
  quote: z.number().optional(),
});

// GET /api/activities?leadId=xxx
activitiesRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { leadId } = req.query as { leadId?: string };
  const activities = await prisma.activity.findMany({
    where: leadId ? { leadId } : undefined,
    include: { createdBy: { select: { id: true, name: true, initials: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ success: true, data: activities });
});

// POST /api/activities
activitiesRouter.post('/', async (req: AuthRequest, res: Response) => {
  const body = CreateActivitySchema.parse(req.body);
  const activity = await prisma.activity.create({
    data: { ...body, createdById: req.user!.userId },
    include: { createdBy: { select: { id: true, name: true, initials: true, avatar: true } } },
  });
  res.status(201).json({ success: true, data: activity });
});

// DELETE /api/activities/:id
activitiesRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.activity.delete({ where: { id: req.params['id'] } });
  res.json({ success: true, message: 'Activity deleted' });
});
