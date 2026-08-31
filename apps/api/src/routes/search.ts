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

  if (!q) {
    res.json({ success: true, data: { leads: [] }, total: 0 });
    return;
  }

  const numericOnly = q.replace(/\D/g, '');
  const parsedNumber = numericOnly ? parseInt(numericOnly, 10) : undefined;

  const orConditions: any[] = [
    { name: { contains: q, mode: 'insensitive' } },
    { projectType: { contains: q, mode: 'insensitive' } },
    { location: { contains: q, mode: 'insensitive' } },
    { phone: { contains: q, mode: 'insensitive' } },
    { email: { contains: q, mode: 'insensitive' } },
  ];

  if (parsedNumber !== undefined && !isNaN(parsedNumber)) {
    orConditions.push({ serialNo: parsedNumber });
  }

  const leads = await prisma.lead.findMany({
    where: {
      OR: orConditions,
    },
    select: {
      id: true,
      serialNo: true,
      name: true,
      projectType: true,
      location: true,
      stage: true,
      budgetLakhs: true,
      priority: true,
      phone: true,
      email: true,
    },
    orderBy: {
      serialNo: 'asc',
    },
    take: limit,
  });

  res.json({
    success: true,
    data: { leads },
    total: leads.length,
    query: q,
  });
});
