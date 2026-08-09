import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';

export const proposalsRouter = Router();
proposalsRouter.use(authenticate);

const CreateProposalSchema = z.object({
  leadId: z.string(),
  amountLakhs: z.number().positive(),
  version: z.number().int().positive().default(1),
});

const UpdateProposalSchema = z.object({
  amountLakhs: z.number().positive().optional(),
  status: z.enum(['Sent', 'Viewed', 'Accepted', 'Rejected']).optional(),
  version: z.number().int().positive().optional(),
});

// GET /api/proposals?leadId=xxx
proposalsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { leadId } = req.query as { leadId?: string };
  const proposals = await prisma.proposal.findMany({
    where: leadId ? { leadId } : undefined,
    include: {
      lead: { select: { id: true, name: true, projectType: true, budgetLakhs: true } },
      createdBy: { select: { id: true, name: true, initials: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: proposals });
});

// GET /api/proposals/:id
proposalsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const proposal = await prisma.proposal.findUnique({
    where: { id: req.params['id'] },
    include: {
      lead: { select: { id: true, name: true, projectType: true, budgetLakhs: true, location: true } },
      createdBy: { select: { id: true, name: true, initials: true } },
    },
  });
  if (!proposal) { res.status(404).json({ success: false, error: 'Proposal not found' }); return; }

  // Increment view count when fetched (simulates link tracking)
  await prisma.proposal.update({
    where: { id: req.params['id'] },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date(), status: proposal.status === 'Sent' ? 'Viewed' : proposal.status },
  });

  res.json({ success: true, data: proposal });
});

// POST /api/proposals
proposalsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const body = CreateProposalSchema.parse(req.body);

  // Check if proposal already exists for this lead
  const existing = await prisma.proposal.findUnique({ where: { leadId: body.leadId } });
  if (existing) {
    // Bump version instead
    const updated = await prisma.proposal.update({
      where: { leadId: body.leadId },
      data: {
        amountLakhs: body.amountLakhs,
        version: existing.version + 1,
        status: 'Sent',
        sentAt: new Date(),
        viewCount: 0,
        lastViewedAt: null,
      },
      include: {
        lead: { select: { id: true, name: true, projectType: true } },
        createdBy: { select: { id: true, name: true, initials: true } },
      },
    });
    res.json({ success: true, data: updated });
    return;
  }

  const proposal = await prisma.proposal.create({
    data: { ...body, createdById: req.user!.userId, sentAt: new Date() },
    include: {
      lead: { select: { id: true, name: true, projectType: true } },
      createdBy: { select: { id: true, name: true, initials: true } },
    },
  });
  res.status(201).json({ success: true, data: proposal });
});

// PATCH /api/proposals/:id
proposalsRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  const body = UpdateProposalSchema.parse(req.body);

  // Get old proposal to check previous status
  const oldProposal = await prisma.proposal.findUnique({
    where: { id: req.params['id'] },
    select: { status: true, createdById: true, lead: { select: { id: true, name: true } } },
  });

  const proposal = await prisma.proposal.update({
    where: { id: req.params['id'] },
    data: body,
    include: {
      lead: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, initials: true } },
    },
  });

  // Fire notification on key status transitions
  if (oldProposal && body.status && body.status !== oldProposal.status && oldProposal.createdById) {
    if (body.status === 'Accepted') {
      await createNotification(
        oldProposal.createdById, 'proposal_viewed',
        '✅ Proposal Accepted!',
        `Your proposal for ${oldProposal.lead?.name} has been accepted! 🎉`,
        oldProposal.lead?.id,
      );
    } else if (body.status === 'Rejected') {
      await createNotification(
        oldProposal.createdById, 'proposal_viewed',
        '❌ Proposal Rejected',
        `The proposal for ${oldProposal.lead?.name} was rejected. Consider revising.`,
        oldProposal.lead?.id,
      );
    } else if (body.status === 'Viewed') {
      await createNotification(
        oldProposal.createdById, 'proposal_viewed',
        '👁 Proposal Viewed',
        `${oldProposal.lead?.name} viewed your proposal.`,
        oldProposal.lead?.id,
      );
    }
  }

  res.json({ success: true, data: proposal });
});


// DELETE /api/proposals/:id
proposalsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.proposal.delete({ where: { id: req.params['id'] } });
  res.json({ success: true, message: 'Proposal deleted' });
});
