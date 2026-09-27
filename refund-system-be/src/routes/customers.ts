import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../lib/prisma';

const router = Router();
const prisma = getPrismaClient();

// ─── GET /api/customers ───────────────────────────────────────────────────────
// Public endpoint for the customer portal dropdown
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        tier: true,
        totalOrders: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(customers);
  } catch (error) {
    console.error('[customers] Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── GET /api/customers/:id/orders ───────────────────────────────────────────
// Fetch orders for a specific customer (for the refund form order selector)
router.get('/:id/orders', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const customerId = id as string;
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }

    const orders = await prisma.order.findMany({
      where: { customerId },
      orderBy: { orderDate: 'desc' },
    });

    res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        tier: customer.tier,
        accountAgeDays: customer.accountAgeDays,
        totalOrders: customer.totalOrders,
      },
      orders,
    });
  } catch (error) {
    console.error('[customers/:id/orders] Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
