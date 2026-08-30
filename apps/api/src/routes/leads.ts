import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';
import { invalidateAnalyticsCache } from './analytics';

export const leadsRouter = Router();
leadsRouter.use(authenticate);

const LEAD_SELECT = {
  id: true, name: true, projectType: true, projectDescription: true, location: true,
  budgetLakhs: true, source: true, priority: true, stage: true, phone: true, email: true,
  winProbability: true, tags: true, stageChangedAt: true, wonAt: true, lostReason: true,
  lostNote: true, callBackAt: true, callBackNote: true, meetingUrl: true, totalCallDurationSecs: true, createdAt: true, updatedAt: true, ownerId: true,
  owner: { select: { id: true, name: true, email: true, role: true, initials: true, avatar: true } },
  _count: { select: { activities: true, notes: true, meetings: true, fileAssets: true } },
};

const CreateLeadSchema = z.object({
  name: z.string().min(2),
  projectType: z.string().min(2),
  projectDescription: z.string().optional().nullable(),
  location: z.string().min(2),
  budgetLakhs: z.number().positive(),
  source: z.enum(['Instagram', 'Google', 'Referral', 'Website', 'Direct', 'WalkIn']).default('Google'),
  priority: z.enum(['HOT', 'WARM', 'COLD']).default('WARM'),
  stage: z.enum(['NEW', 'CONTACTED', 'CALL_BACK', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).default('NEW'),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  winProbability: z.number().min(0).max(100).default(0),
  tags: z.array(z.string()).default([]).transform((t) => JSON.stringify(t)),
  ownerId: z.string().optional(),
  callBackAt: z.union([z.string(), z.date()]).optional().nullable().transform((v) => v ? new Date(v) : null),
  callBackNote: z.string().optional().nullable(),
  meetingUrl: z.string().optional().nullable(),
  lostReason: z.string().optional().nullable(),
  lostNote: z.string().optional().nullable(),
});

const UpdateLeadSchema = CreateLeadSchema.partial();

// GET /api/leads
leadsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { stage, source, priority, ownerId, search, page = '1', limit = '20' } = req.query as Record<string, string>;

  const where: Record<string, unknown> = {};
  if (stage) where['stage'] = stage;
  if (source) where['source'] = source;
  if (priority) where['priority'] = priority;
  if (ownerId) where['ownerId'] = ownerId;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit) || 20));

  // SQLite-compatible case-insensitive search via raw SQL
  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    const matchingIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM leads
      WHERE LOWER(name) LIKE ${term}
         OR LOWER(projectType) LIKE ${term}
         OR LOWER(location) LIKE ${term}
         OR LOWER(COALESCE(phone, '')) LIKE ${term}
         OR LOWER(COALESCE(email, '')) LIKE ${term}
    `;
    const ids = matchingIds.map((r) => r.id);
    where['id'] = { in: ids };
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      select: LEAD_SELECT,
      orderBy: { id: 'asc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.lead.count({ where }),
  ]);

  const parsed = leads.map((l: Record<string, unknown>) => ({ ...l, tags: JSON.parse((l['tags'] as string) ?? '[]') }));
  res.json({ success: true, data: parsed, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
});

// GET /api/leads/:id
leadsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params['id'] },
    include: {
      owner: { select: { id: true, name: true, email: true, role: true, initials: true, avatar: true } },
      activities: { include: { createdBy: { select: { id: true, name: true, initials: true } } }, orderBy: { createdAt: 'desc' } },
      notes: { include: { createdBy: { select: { id: true, name: true, initials: true } } }, orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }] },
      meetings: { include: { createdBy: { select: { id: true, name: true, initials: true } } }, orderBy: { scheduledAt: 'asc' } },
      fileAssets: { include: { uploadedBy: { select: { id: true, name: true, initials: true } } }, orderBy: { createdAt: 'desc' } },
      proposal: true,
    },
  });

  if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return; }
  const parsed = { ...lead, tags: JSON.parse((lead as Record<string, unknown>)['tags'] as string ?? '[]') };
  res.json({ success: true, data: parsed });
});

// POST /api/leads
leadsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const body = CreateLeadSchema.parse(req.body);
  const ownerId = body.ownerId ?? req.user!.userId;
  const lead = await prisma.lead.create({
    data: { ...body, ownerId, stageChangedAt: new Date() },
    select: LEAD_SELECT,
  });

  // Log creation activity
  await prisma.activity.create({
    data: {
      leadId: lead.id,
      type: 'STAGE_CHANGE',
      text: `Lead created in ${stageLabel(lead.stage)} stage`,
      createdById: req.user!.userId,
    },
  });

  invalidateAnalyticsCache();
  res.status(201).json({ success: true, data: lead });
});

// Helper for stage label in activity logs
function stageLabel(s: string): string {
  const labels: Record<string, string> = {
    NEW: 'New Enquiry',
    CONTACTED: 'Contacted',
    CALL_BACK: 'Call Back ⏰',
    MEETING: 'Google Meet 🎥',
    PROPOSAL: 'Proposal Sent 📄',
    NEGOTIATION: 'Negotiation',
    WON: 'Won 🎉',
    LOST: 'Lost ❌',
  };
  return labels[s] ?? s;
}

// PATCH /api/leads/:id
leadsRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  const body = UpdateLeadSchema.parse(req.body);
  const existing = await prisma.lead.findUnique({
    where: { id: req.params['id'] },
    select: { stage: true, name: true, ownerId: true },
  });
  if (!existing) { res.status(404).json({ success: false, error: 'Lead not found' }); return; }

  const data: Record<string, unknown> = { ...body };
  const stageChanged = body.stage && body.stage !== existing.stage;
  if (stageChanged) {
    data['stageChangedAt'] = new Date();
    if (body.stage === 'WON') data['wonAt'] = new Date();
  }

  const lead = await prisma.lead.update({ where: { id: req.params['id'] }, data, select: LEAD_SELECT });

  // Auto-log activity on stage change
  if (stageChanged) {
    await prisma.activity.create({
      data: {
        leadId: req.params['id'],
        type: 'STAGE_CHANGE',
        text: `Stage changed from ${stageLabel(existing.stage)} → ${stageLabel(body.stage!)}`,
        createdById: req.user!.userId,
      },
    });

    // Fire notification on key stage transitions
    if (existing.ownerId) {
      const label = stageLabel(body.stage!);
      if (body.stage === 'WON') {
        await createNotification(existing.ownerId, 'lead_won', `🏆 Lead Won!`, `${existing.name} has been marked as Won. Great work!`, req.params['id']);
      } else if (body.stage === 'LOST') {
        await createNotification(existing.ownerId, 'stage_change', `Lead Lost`, `${existing.name} has been moved to Lost.`, req.params['id']);
      } else {
        await createNotification(existing.ownerId, 'stage_change', `Stage Updated → ${label}`, `${existing.name} moved to ${label}`, req.params['id']);
      }
    }
  }

  invalidateAnalyticsCache();
  res.json({ success: true, data: lead });
});

// DELETE /api/leads/:id
leadsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.lead.delete({ where: { id: req.params['id'] } });
  invalidateAnalyticsCache();
  res.json({ success: true, message: 'Lead deleted' });
});
