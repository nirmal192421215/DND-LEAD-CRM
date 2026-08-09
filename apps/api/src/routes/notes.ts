import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

export const notesRouter = Router();
notesRouter.use(authenticate);

const CreateNoteSchema = z.object({
  leadId: z.string(),
  text: z.string().min(1),
  pinned: z.boolean().default(false),
});

// GET /api/notes?leadId=xxx
notesRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { leadId } = req.query as { leadId?: string };
  const notes = await prisma.note.findMany({
    where: leadId ? { leadId } : undefined,
    include: { createdBy: { select: { id: true, name: true, initials: true } } },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ success: true, data: notes });
});

// POST /api/notes
notesRouter.post('/', async (req: AuthRequest, res: Response) => {
  const body = CreateNoteSchema.parse(req.body);
  const note = await prisma.note.create({
    data: { ...body, createdById: req.user!.userId },
    include: { createdBy: { select: { id: true, name: true, initials: true } } },
  });
  res.status(201).json({ success: true, data: note });
});

// PATCH /api/notes/:id
notesRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { text, pinned } = req.body;
  const note = await prisma.note.update({
    where: { id: req.params['id'] },
    data: { text, pinned },
    include: { createdBy: { select: { id: true, name: true, initials: true } } },
  });
  res.json({ success: true, data: note });
});

// DELETE /api/notes/:id
notesRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.note.delete({ where: { id: req.params['id'] } });
  res.json({ success: true, message: 'Note deleted' });
});
