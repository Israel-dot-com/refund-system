import { Router, Request, Response } from 'express';
import { refundRateLimit } from '../middleware/rateLimit';
import { sanitizeMessage } from '../services/sanitizer';
import { runPreflightPolicy, runPostflightValidation } from '../services/policyEngine';
import { getAIDecision } from '../services/aiService';
import { getPrismaClient } from '../lib/prisma';
import type {
  CustomerContext,
  OrderContext,
  RefundRequestPayload,
} from '../types';

const router = Router();
const prisma = getPrismaClient();

// ─── POST /api/refund/submit ──────────────────────────────────────────────────
router.post('/submit', refundRateLimit, async (req: Request, res: Response): Promise<void> => {
  const { customerId, orderId, message } = req.body as RefundRequestPayload;

  // ── Input validation ────────────────────────────────────────────────────────
  if (!customerId || !orderId || !message) {
    res.status(400).json({ error: 'customerId, orderId, and message are required.' });
    return;
  }

  if (typeof message !== 'string' || message.trim().length < 10) {
    res.status(400).json({ error: 'Message must be at least 10 characters.' });
    return;
  }

  try {
    // ── Fetch customer + order from DB ─────────────────────────────────────
    const [customer, order] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.order.findUnique({ where: { id: orderId } }),
    ]);

    if (!customer) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (order.customerId !== customerId) {
      res.status(403).json({ error: 'This order does not belong to this customer.' });
      return;
    }

    // ── Count recent refund requests (fraud signal) ────────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentRefundCount = await prisma.refundRequest.count({
      where: {
        customerId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // ── Check for duplicate pending refund on same order ──────────────────
    const existingRequest = await prisma.refundRequest.findFirst({
      where: { orderId, decision: 'PENDING' },
    });
    if (existingRequest) {
      res.status(409).json({
        error: 'A pending refund request already exists for this order.',
        requestId: existingRequest.id,
      });
      return;
    }

    // ── Build context objects ──────────────────────────────────────────────
    const daysSinceDelivery =
      order.deliveredDate
        ? Math.floor((Date.now() - order.deliveredDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const customerCtx: CustomerContext = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      tier: customer.tier as CustomerContext['tier'],
      accountAgeDays: customer.accountAgeDays,
      totalOrders: customer.totalOrders,
      fraudFlags: customer.fraudFlags,
      recentRefundCount,
    };

    const orderCtx: OrderContext = {
      id: order.id,
      productName: order.productName,
      productSku: order.productSku,
      amount: order.amount,
      status: order.status as OrderContext['status'],
      isFinalSale: order.isFinalSale,
      orderDate: order.orderDate,
      deliveredDate: order.deliveredDate,
      itemCondition: order.itemCondition as OrderContext['itemCondition'],
      daysSinceDelivery,
    };

    // ── Sanitize customer message ──────────────────────────────────────────
    const { sanitized, injectionDetected, injectionFlags } = sanitizeMessage(message);

    // ── Pre-flight policy engine ───────────────────────────────────────────
    const preflight = runPreflightPolicy(customerCtx, orderCtx);

    let finalDecision: string;
    let reasoning: string;
    let policyCitations: string[];
    let confidenceScore: number | null;
    let allFlags: string[];
    let overrideReason: string | null = null;

    if (injectionDetected) {
      // Prompt injection detected — escalate immediately
      finalDecision = 'ESCALATED';
      reasoning =
        'Your request contains language that appears to attempt to manipulate the system. The request has been escalated for manual review.';
      policyCitations = ['Security Policy: Prompt injection prevention'];
      confidenceScore = 1.0;
      allFlags = [...injectionFlags.map(() => 'PROMPT_INJECTION_DETECTED'), ...preflight.flags];
    } else if (!preflight.passed) {
      // Hard policy rule triggered — use deterministic result
      finalDecision = preflight.hardDecision!;
      reasoning = preflight.reason!;
      policyCitations = preflight.flags;
      confidenceScore = 1.0;
      allFlags = preflight.flags;
    } else {
      // ── AI decision layer ────────────────────────────────────────────────
      const aiResult = await getAIDecision(customerCtx, orderCtx, sanitized, preflight.flags);

      // ── Post-flight validation ───────────────────────────────────────────
      const postflight = runPostflightValidation(
        aiResult.decision,
        customerCtx,
        orderCtx,
        aiResult.confidenceScore,
      );

      finalDecision = postflight.finalDecision;
      reasoning = aiResult.reasoning;
      policyCitations = aiResult.policyCitations;
      confidenceScore = aiResult.confidenceScore;
      allFlags = [...preflight.flags, ...aiResult.flags];
      overrideReason = postflight.overrideReason;
    }

    // ── Persist refund request ────────────────────────────────────────────
    const refundRequest = await prisma.refundRequest.create({
      data: {
        customerId,
        orderId,
        message: sanitized,
        decision: finalDecision as any,
        aiReasoning: reasoning,
        aiConfidence: confidenceScore,
        policyCitations,
        policyFlags: allFlags,
        amountRequested: order.amount,
        overrideReason,
      },
    });

    // ── Persist audit log ────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        refundRequestId: refundRequest.id,
        eventType: 'REFUND_PROCESSED',
        payload: {
          decision: finalDecision,
          preflightPassed: preflight.passed,
          injectionDetected,
          confidenceScore,
          overrideReason,
          flags: allFlags,
        },
      },
    });

    res.status(201).json({
      requestId: refundRequest.id,
      decision: finalDecision,
      reasoning,
      policyCitations,
      flags: allFlags,
      confidenceScore,
      amountRequested: order.amount,
    });
  } catch (error) {
    console.error('[refund/submit] Error:', error);
    res.status(500).json({ error: 'An internal error occurred while processing your request.' });
  }
});

// ─── GET /api/refund/:requestId ───────────────────────────────────────────────
router.get('/:requestId', async (req: Request, res: Response): Promise<void> => {
  const { requestId } = req.params;

  try {
    const request = await prisma.refundRequest.findUnique({
      where: { id: requestId as string },
      include: {
        customer: { select: { name: true, email: true, tier: true } },
        order: { select: { productName: true, amount: true, status: true } },
        auditLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!request) {
      res.status(404).json({ error: 'Refund request not found.' });
      return;
    }

    res.json(request);
  } catch (error) {
    console.error('[refund/:id] Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
