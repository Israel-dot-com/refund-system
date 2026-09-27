import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { getPrismaClient } from '../lib/prisma';

const router = Router();
const prisma = getPrismaClient();

// All admin routes require API key auth
router.use(adminAuth);

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [total, approved, denied, escalated, pending] = await Promise.all([
      prisma.refundRequest.count(),
      prisma.refundRequest.count({ where: { decision: 'APPROVED' } }),
      prisma.refundRequest.count({ where: { decision: 'DENIED' } }),
      prisma.refundRequest.count({ where: { decision: 'ESCALATED' } }),
      prisma.refundRequest.count({ where: { decision: 'PENDING' } }),
    ]);

    // Average AI confidence (only for AI-processed requests)
    const confidenceAgg = await prisma.refundRequest.aggregate({
      _avg: { aiConfidence: true },
      where: { aiConfidence: { not: null } },
    });

    res.json({
      total,
      approved,
      denied,
      escalated,
      pending,
      avgConfidence: confidenceAgg._avg.aiConfidence,
    });
  } catch (error) {
    console.error('[admin/stats] Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/admin/requests ──────────────────────────────────────────────────
router.get('/requests', async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const status = req.query.status as string | undefined;
  const skip = (page - 1) * limit;

  const where = status ? { decision: status as any } : {};

  try {
    const [requests, total] = await Promise.all([
      prisma.refundRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, email: true, tier: true } },
          order: {
            select: { productName: true, amount: true, status: true, isFinalSale: true },
          },
        },
      }),
      prisma.refundRequest.count({ where }),
    ]);

    res.json({
      data: requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[admin/requests] Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/admin/requests/:id ──────────────────────────────────────────────
router.get('/requests/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const request = await prisma.refundRequest.findUnique({
      where: { id: id as string },
      include: {
        customer: true,
        order: true,
        auditLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!request) {
      res.status(404).json({ error: 'Refund request not found.' });
      return;
    }

    res.json(request);
  } catch (error) {
    console.error('[admin/requests/:id] Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── PATCH /api/admin/requests/:id ───────────────────────────────────────────
// Human override — support agent can approve/deny an escalated request
router.patch('/requests/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { decision, override_reason } = req.body as {
    decision: 'APPROVED' | 'DENIED';
    override_reason: string;
  };

  if (!decision || !['APPROVED', 'DENIED'].includes(decision)) {
    res.status(400).json({ error: 'decision must be APPROVED or DENIED.' });
    return;
  }
  if (!override_reason || override_reason.trim().length < 5) {
    res.status(400).json({ error: 'override_reason is required for manual decisions.' });
    return;
  }

  try {
    const existing = await prisma.refundRequest.findUnique({ where: { id: id as string } });
    if (!existing) {
      res.status(404).json({ error: 'Refund request not found.' });
      return;
    }

    const updated = await prisma.refundRequest.update({
      where: { id: id as string },
      data: {
        decision: decision as any,
        overrideReason: override_reason.trim(),
      },
    });

    // Audit the human override
    await prisma.auditLog.create({
      data: {
        refundRequestId: id as string,
        eventType: 'HUMAN_OVERRIDE',
        payload: {
          previousDecision: existing.decision,
          newDecision: decision,
          overrideReason: override_reason.trim(),
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('[admin/requests/:id PATCH] Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/admin/customers ─────────────────────────────────────────────────
router.get('/customers', async (_req: Request, res: Response): Promise<void> => {
  try {
    const customers = await prisma.customer.findMany({
      include: { orders: true },
      orderBy: { name: 'asc' },
    });
    res.json(customers);
  } catch (error) {
    console.error('[admin/customers] Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
