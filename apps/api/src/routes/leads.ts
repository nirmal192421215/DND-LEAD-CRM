import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';
import { invalidateAnalyticsCache } from './analytics';

export const leadsRouter = Router();
leadsRouter.use(authenticate);

const LEAD_SELECT = {
  id: true, serialNo: true, name: true, projectType: true, projectDescription: true, location: true,
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
      orderBy: { serialNo: 'asc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.lead.count({ where }),
  ]);

  const parsed = leads.map((l: Record<string, unknown>) => ({ ...l, tags: JSON.parse((l['tags'] as string) ?? '[]') }));
  res.json({ success: true, data: parsed, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
});

// Helper to align existing leads from 1 to N and set sequence to continue from max + 1
export async function alignSerialNumbers() {
  try {
    const minLead = await prisma.lead.findFirst({
      orderBy: { serialNo: 'asc' },
      select: { serialNo: true },
    });

    // If lowest serial number is > 1 (e.g. 103), re-number existing leads 1..N
    if (minLead && minLead.serialNo > 1) {
      console.log('🔄 Re-aligning lead serial numbers to start from 1, 2, 3...');
      await prisma.$executeRawUnsafe(`
        WITH numbered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, id ASC) as rn
          FROM leads
        )
        UPDATE leads
        SET "serialNo" = numbered.rn
        FROM numbered
        WHERE leads.id = numbered.id;
      `);

      await prisma.$executeRawUnsafe(`
        SELECT setval(
          pg_get_serial_sequence('leads', 'serialNo'),
          COALESCE((SELECT MAX("serialNo") FROM leads), 0) + 1,
          false
        );
      `);
      console.log('✅ Serial numbers successfully re-aligned from 1 to N!');
    }
  } catch (err) {
    console.error('Serial alignment error:', err);
  }
}

leadsRouter.post('/realign-serials', async (_req: AuthRequest, res: Response) => {
  await alignSerialNumbers();
  res.json({ success: true, message: 'Serial numbers re-aligned to 1..N' });
});

const BulkImportSchema = z.object({
  leads: z.array(z.object({
    name: z.string().min(1),
    phone: z.string().optional().nullable(),
    projectType: z.string().optional().nullable(),
    projectDescription: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    budgetLakhs: z.number().optional().nullable(),
    source: z.enum(['Instagram', 'Google', 'Referral', 'Website', 'Direct', 'WalkIn']).optional(),
    priority: z.enum(['HOT', 'WARM', 'COLD']).optional(),
    stage: z.enum(['NEW', 'CONTACTED', 'CALL_BACK', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
    email: z.string().optional().nullable(),
    winProbability: z.number().min(0).max(100).optional(),
    tags: z.array(z.string()).optional(),
  })),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    ownerId: z.string().optional(),
    defaultPriority: z.enum(['HOT', 'WARM', 'COLD']).optional(),
    defaultSource: z.enum(['Instagram', 'Google', 'Referral', 'Website', 'Direct', 'WalkIn']).optional(),
  }).optional(),
});

// POST /api/leads/bulk-import
leadsRouter.post('/bulk-import', async (req: AuthRequest, res: Response) => {
  const body = BulkImportSchema.parse(req.body);
  const skipDuplicates = body.options?.skipDuplicates ?? true;
  const ownerId = body.options?.ownerId || req.user!.userId;

  // Align Postgres sequence to continue from max serial number
  try {
    await prisma.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('leads', 'serialNo'),
        COALESCE((SELECT MAX("serialNo") FROM leads), 0) + 1,
        false
      );
    `);
  } catch (err) {
    console.warn('Could not reset sequence for bulk import:', err);
  }

  // Fetch existing phones and names for deduplication
  const existingLeads = await prisma.lead.findMany({
    select: { phone: true, name: true },
  });

  const existingPhones = new Set<string>();
  const existingNames = new Set<string>();
  for (const el of existingLeads) {
    if (el.phone) {
      const p = el.phone.replace(/\D/g, '').slice(-10);
      if (p.length === 10) existingPhones.add(p);
    }
    if (el.name) existingNames.add(el.name.trim().toLowerCase());
  }

  const createdLeads: any[] = [];
  let skippedCount = 0;

  for (const item of body.leads) {
    const digits = (item.phone || '').replace(/\D/g, '');
    let cleanedPhone = digits;
    if (digits.length === 12 && digits.startsWith('91')) cleanedPhone = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith('0')) cleanedPhone = digits.slice(1);
    else if (digits.length > 10) cleanedPhone = digits.slice(-10);

    // Rule: Reject any lead without a valid 10-digit phone
    if (cleanedPhone.length !== 10) {
      skippedCount++;
      continue;
    }

    const nameKey = item.name.trim().toLowerCase();
    if (skipDuplicates && (existingPhones.has(cleanedPhone) || existingNames.has(nameKey))) {
      skippedCount++;
      continue;
    }

    existingPhones.add(cleanedPhone);
    existingNames.add(nameKey);

    const newLead = await prisma.lead.create({
      data: {
        name: item.name.trim(),
        phone: cleanedPhone,
        projectType: item.projectType?.trim() || 'Interior Design',
        projectDescription: item.projectDescription?.trim() || null,
        location: item.location?.trim() || 'Coimbatore',
        budgetLakhs: item.budgetLakhs && item.budgetLakhs > 0 ? item.budgetLakhs : 15,
        source: item.source || body.options?.defaultSource || 'Google',
        priority: item.priority || body.options?.defaultPriority || 'WARM',
        stage: item.stage || 'NEW',
        email: item.email?.trim() || null,
        winProbability: item.winProbability ?? 30,
        tags: JSON.stringify(item.tags && item.tags.length ? item.tags : ['Google Maps']),
        ownerId,
        stageChangedAt: new Date(),
      },
      select: LEAD_SELECT,
    });
    createdLeads.push(newLead);
  }

  if (createdLeads.length > 0) {
    await prisma.activity.createMany({
      data: createdLeads.map((l) => ({
        leadId: l.id,
        type: 'STAGE_CHANGE',
        text: `Lead bulk-imported from CSV into New Enquiry`,
        createdById: req.user!.userId,
      })),
    });
    invalidateAnalyticsCache();
  }

  const parsed = createdLeads.map((l) => ({
    ...l,
    tags: JSON.parse((l['tags'] as string) ?? '[]'),
  }));

  res.status(201).json({
    success: true,
    inserted: createdLeads.length,
    skipped: skippedCount,
    total: body.leads.length,
    firstSerial: createdLeads[0]?.serialNo ?? null,
    lastSerial: createdLeads[createdLeads.length - 1]?.serialNo ?? null,
    data: parsed,
  });
});

// GET /api/leads/:id
leadsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const param = req.params['id'];
  const includeOptions = {
    owner: { select: { id: true, name: true, email: true, role: true, initials: true, avatar: true } },
    activities: { include: { createdBy: { select: { id: true, name: true, initials: true } } }, orderBy: { createdAt: 'desc' as const } },
    notes: { include: { createdBy: { select: { id: true, name: true, initials: true } } }, orderBy: [{ pinned: 'desc' as const }, { createdAt: 'desc' as const }] },
    meetings: { include: { createdBy: { select: { id: true, name: true, initials: true } } }, orderBy: { scheduledAt: 'asc' as const } },
    fileAssets: { include: { uploadedBy: { select: { id: true, name: true, initials: true } } }, orderBy: { createdAt: 'desc' as const } },
    proposal: true,
  };

  let lead = await prisma.lead.findUnique({
    where: { id: param },
    include: includeOptions,
  });

  // If not found by primary key ID, lookup by serialNo (handles e.g. "1", "001", "DND-001")
  if (!lead) {
    const numericPart = param.replace(/\D/g, '');
    if (numericPart) {
      const serialNum = parseInt(numericPart, 10);
      lead = await prisma.lead.findFirst({
        where: { serialNo: serialNum },
        include: includeOptions,
      });
    }
  }

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
  const param = req.params['id'];
  let existing = await prisma.lead.findUnique({
    where: { id: param },
    select: { id: true, stage: true, name: true, ownerId: true },
  });

  if (!existing) {
    const numericPart = param.replace(/\D/g, '');
    if (numericPart) {
      existing = await prisma.lead.findFirst({
        where: { serialNo: parseInt(numericPart, 10) },
        select: { id: true, stage: true, name: true, ownerId: true },
      });
    }
  }

  if (!existing) { res.status(404).json({ success: false, error: 'Lead not found' }); return; }

  const targetLeadId = existing.id;
  const data: Record<string, unknown> = { ...body };
  const stageChanged = body.stage && body.stage !== existing.stage;
  if (stageChanged) {
    data['stageChangedAt'] = new Date();
    if (body.stage === 'WON') data['wonAt'] = new Date();
  }

  const lead = await prisma.lead.update({ where: { id: targetLeadId }, data, select: LEAD_SELECT });

  // Auto-log activity on stage change
  if (stageChanged) {
    await prisma.activity.create({
      data: {
        leadId: targetLeadId,
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
