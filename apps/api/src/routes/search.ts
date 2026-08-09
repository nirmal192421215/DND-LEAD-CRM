import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const searchRouter = Router();
searchRouter.use(authenticate);

/**
 * GET /api/search?q=term&limit=10
 * Global case-insensitive full-text search across leads.
 * Uses raw SQL LOWER() for SQLite compatibility.
 */
searchRouter.get('/', async (req: AuthRequest, res: Response) => {
  const q = ((req.query['q'] as string) ?? '').trim();
  const limit = Math.min(20, Math.max(1, parseInt((req.query['limit'] as string) ?? '10') || 10));

  if (!q || q.length < 2) {
    res.json({ success: true, data: { leads: [] }, total: 0 });
    return;
  }

  const term = `%${q.toLowerCase()}%`;

  const leads = await prisma.$queryRaw<{
    id: string;
    name: string;
    projectType: string;
    location: string;
    stage: string;
    budgetLakhs: number;
    priority: string;
    phone: string | null;
    email: string | null;
  }[]>`
    SELECT id, name, projectType, location, stage, budgetLakhs, priority, phone, email
    FROM leads
    WHERE LOWER(name) LIKE ${term}
       OR LOWER(projectType) LIKE ${term}
       OR LOWER(location) LIKE ${term}
       OR LOWER(COALESCE(phone, '')) LIKE ${term}
       OR LOWER(COALESCE(email, '')) LIKE ${term}
    ORDER BY
      CASE
        WHEN LOWER(name) LIKE ${term} THEN 0
        WHEN LOWER(projectType) LIKE ${term} THEN 1
        ELSE 2
      END,
      name ASC
    LIMIT ${limit}
  `;

  res.json({
    success: true,
    data: { leads },
    total: leads.length,
    query: q,
  });
});
