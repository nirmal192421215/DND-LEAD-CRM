import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const analyticsRouter = Router();
analyticsRouter.use(authenticate);

// ── In-Memory Analytics Cache (TTL: 30s) ────────────────────────────────────
interface CacheEntry { data: unknown; timestamp: number; }
let overviewCache: CacheEntry | null = null;
const CACHE_TTL_MS = 30_000;

export function invalidateAnalyticsCache() {
  overviewCache = null;
}

const STAGES = ['NEW', 'CONTACTED', 'MEETING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;

// GET /api/analytics/overview
analyticsRouter.get('/overview', async (_req: AuthRequest, res: Response) => {
  const now = Date.now();
  if (overviewCache && now - overviewCache.timestamp < CACHE_TTL_MS) {
    res.json(overviewCache.data);
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [allLeads, funnel, sourceGroups, todayMeetings] = await Promise.all([
    prisma.lead.findMany({ select: { stage: true, budgetLakhs: true, winProbability: true } }),
    prisma.lead.groupBy({
      by: ['stage'],
      _count: { _all: true },
      _sum: { budgetLakhs: true },
    }),
    prisma.lead.groupBy({
      by: ['source'],
      _count: { _all: true },
      orderBy: { _count: { source: 'desc' } },
    }),
    prisma.meeting.count({
      where: { scheduledAt: { gte: today, lt: tomorrow }, completed: false },
    }),
  ]);

  const total = allLeads.length;
  const won = allLeads.filter((l) => l.stage === 'WON').length;
  const lost = allLeads.filter((l) => l.stage === 'LOST').length;
  const active = allLeads.filter((l) => !['WON', 'LOST'].includes(l.stage)).length;
  const pipelineValue = allLeads.filter((l) => !['WON', 'LOST'].includes(l.stage)).reduce((acc, l) => acc + l.budgetLakhs, 0);
  const weightedForecast = allLeads
    .filter((l) => !['WON', 'LOST'].includes(l.stage))
    .reduce((acc, l) => acc + l.budgetLakhs * (l.winProbability / 100), 0);

  const funnelData = STAGES.map((stage) => {
    const found = funnel.find((f) => f.stage === stage);
    return { stage, count: found?._count._all ?? 0, valueLakhs: found?._sum.budgetLakhs ?? 0 };
  });

  const bySource = sourceGroups.map((s) => ({ source: s.source, count: s._count._all }));

  const responseObj = {
    success: true,
    data: {
      totalLeads: total,
      activeLeads: active,
      wonLeads: won,
      lostLeads: lost,
      conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
      pipelineValueLakhs: Math.round(pipelineValue * 100) / 100,
      weightedForecastLakhs: Math.round(weightedForecast * 100) / 100,
      winLoss: { won, lost, stalled: total - won - lost },
      funnel: funnelData,
      bySource,
      todaysMeetings: todayMeetings,
    },
  };

  overviewCache = { data: responseObj, timestamp: Date.now() };
  res.json(responseObj);
});


// GET /api/analytics/pipeline-by-stage
analyticsRouter.get('/pipeline-by-stage', async (_req: AuthRequest, res: Response) => {
  const data = await prisma.lead.groupBy({
    by: ['stage'],
    where: { stage: { notIn: ['WON', 'LOST'] } },
    _count: { _all: true },
    _sum: { budgetLakhs: true },
  });

  res.json({
    success: true,
    data: data.map((d) => ({ stage: d.stage, count: d._count._all, valueLakhs: d._sum.budgetLakhs ?? 0 })),
  });
});

// GET /api/analytics/source-breakdown
analyticsRouter.get('/source-breakdown', async (_req: AuthRequest, res: Response) => {
  const data = await prisma.lead.groupBy({
    by: ['source'],
    _count: { _all: true },
  });
  res.json({ success: true, data: data.map((d) => ({ source: d.source, count: d._count._all })) });
});

// GET /api/analytics/team-leaderboard
analyticsRouter.get('/team-leaderboard', async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, initials: true, role: true,
      ownedLeads: { select: { stage: true, budgetLakhs: true, winProbability: true } },
    },
  });

  const leaderboard = users.map((u) => {
    const leads = u.ownedLeads;
    const won = leads.filter((l) => l.stage === 'WON').length;
    const active = leads.filter((l) => !['WON', 'LOST'].includes(l.stage)).length;
    const pipeline = leads.filter((l) => !['WON', 'LOST'].includes(l.stage)).reduce((a, l) => a + l.budgetLakhs, 0);
    const weighted = leads.filter((l) => !['WON', 'LOST'].includes(l.stage)).reduce((a, l) => a + l.budgetLakhs * (l.winProbability / 100), 0);
    return {
      id: u.id, name: u.name, initials: u.initials, role: u.role,
      totalLeads: leads.length, activeLeads: active, wonLeads: won,
      pipelineLakhs: Math.round(pipeline * 10) / 10,
      weightedLakhs: Math.round(weighted * 10) / 10,
      conversionRate: leads.length > 0 ? Math.round((won / leads.length) * 100) : 0,
    };
  }).sort((a, b) => b.weightedLakhs - a.weightedLakhs);

  res.json({ success: true, data: leaderboard });
});

// GET /api/analytics/monthly-trends
analyticsRouter.get('/monthly-trends', async (_req: AuthRequest, res: Response) => {
  // Get all leads with createdAt, wonAt, stage
  const leads = await prisma.lead.findMany({
    select: { createdAt: true, wonAt: true, stage: true, budgetLakhs: true },
  });

  // Build last 6 months
  const months: { label: string; key: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    months.push({ label, key });
  }

  const trend = months.map(({ label, key }) => {
    const [year, month] = key.split('-').map(Number);
    const newLeads = leads.filter((l) => {
      const d = new Date(l.createdAt);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    }).length;
    const wonLeads = leads.filter((l) => {
      if (!l.wonAt) return false;
      const d = new Date(l.wonAt);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    const wonValue = wonLeads.reduce((a, l) => a + l.budgetLakhs, 0);
    return { month: label, newLeads, wonLeads: wonLeads.length, wonValueLakhs: Math.round(wonValue * 10) / 10 };
  });

  res.json({ success: true, data: trend });
});

// GET /api/leads/search?q=xxx
analyticsRouter.get('/search', async (req: AuthRequest, res: Response) => {
  const q = (req.query['q'] as string ?? '').trim();
  if (!q) { res.json({ success: true, data: [] }); return; }

  // SQLite doesn't support mode:'insensitive'; use raw LIKE with LOWER()
  const pattern = `%${q.toLowerCase()}%`;
  const leads = await prisma.$queryRaw<Array<{
    id: string; name: string; stage: string; projectType: string;
    location: string; budgetLakhs: number; priority: string;
  }>>`
    SELECT id, name, stage, projectType, location, budgetLakhs, priority
    FROM leads
    WHERE LOWER(name) LIKE ${pattern}
       OR LOWER(location) LIKE ${pattern}
       OR LOWER(projectType) LIKE ${pattern}
       OR LOWER(email) LIKE ${pattern}
       OR phone LIKE ${pattern}
    LIMIT 8
  `;

  res.json({ success: true, data: leads });
});

