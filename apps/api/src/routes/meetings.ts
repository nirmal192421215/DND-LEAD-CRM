import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const meetingsRouter = Router();
meetingsRouter.use(authenticate);

const CreateMeetingSchema = z.object({
  leadId: z.string(),
  title: z.string().min(2),
  type: z.enum(['VideoCall', 'StudioMeeting', 'SiteVisit', 'PhoneCall']),
  scheduledAt: z.string().datetime(),
  durationMins: z.number().positive().default(60),
});

// GET /api/meetings?leadId=xxx&from=ISO&to=ISO&limit=10
meetingsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { leadId, from, to, limit } = req.query as {
    leadId?: string; from?: string; to?: string; limit?: string;
  };

  const where: Record<string, unknown> = {};
  if (leadId) where['leadId'] = leadId;
  if (from || to) {
    where['scheduledAt'] = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to) }   : {}),
    };
  }

  const meetings = await prisma.meeting.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, initials: true } },
      lead: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: limit ? Math.min(50, parseInt(limit) || 10) : undefined,
  });
  res.json({ success: true, data: meetings });
});

// POST /api/meetings
meetingsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const body = CreateMeetingSchema.parse(req.body);
  const meeting = await prisma.meeting.create({
    data: { ...body, scheduledAt: new Date(body.scheduledAt), createdById: req.user!.userId },
    include: { createdBy: { select: { id: true, name: true, initials: true } } },
  });
  res.status(201).json({ success: true, data: meeting });
});

// PATCH /api/meetings/:id/complete
meetingsRouter.patch('/:id/complete', async (req: AuthRequest, res: Response) => {
  const meeting = await prisma.meeting.update({
    where: { id: req.params['id'] },
    data: { completed: true },
    include: { createdBy: { select: { id: true, name: true, initials: true } } },
  });
  res.json({ success: true, data: meeting });
});

// DELETE /api/meetings/:id
meetingsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.meeting.delete({ where: { id: req.params['id'] } });
  res.json({ success: true, message: 'Meeting deleted' });
});
