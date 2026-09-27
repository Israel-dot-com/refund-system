import { PrismaClient, Tier, OrderStatus, ItemCondition } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

// Helper: subtract days from today
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  // Idempotency check — only seed if empty
  const existingCount = await prisma.customer.count();
  if (existingCount > 0) {
    console.log(`✅ Database already has ${existingCount} customers — skipping seed.`);
    return;
  }

  console.log('🌱 Seeding database with 15 customers and their orders...');

  // ── 15 Customers, each covering a specific policy scenario ────────────────
  const customers = await Promise.all([
    // 1. Alice Johnson — VIP, recent delivery, shipping-damaged item → APPROVE
    prisma.customer.create({
      data: {
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        accountAgeDays: 720,
        tier: Tier.VIP,
        totalOrders: 34,
        fraudFlags: 0,
        orders: {
          create: {
            productName: 'Wireless Noise-Cancelling Headphones',
            productSku: 'ELEC-WNC-001',
            amount: 249.99,
            status: OrderStatus.DELIVERED,
            isFinalSale: false,
            orderDate: daysAgo(10),
            deliveredDate: daysAgo(7),
            itemCondition: ItemCondition.DAMAGED,
          },
        },
      },
    }),

    // 2. Bob Martinez — Standard, final sale item → DENY
    prisma.customer.create({
      data: {
        name: 'Bob Martinez',
        email: 'bob.martinez@example.com',
        accountAgeDays: 180,
        tier: Tier.STANDARD,
        totalOrders: 5,
        fraudFlags: 0,
        orders: {
          create: {
            productName: 'Vintage Band T-Shirt (Final Sale)',
            productSku: 'APP-VBT-FS-002',
            amount: 35.00,
            status: OrderStatus.DELIVERED,
            isFinalSale: true,
            orderDate: daysAgo(14),
            deliveredDate: daysAgo(12),
            itemCondition: ItemCondition.GOOD,
          },
        },
      },
    }),

    // 3. Carol Smith — Premium, $650 order (above $750 threshold for premium) → actually approve; test $800 case → ESCALATE
    prisma.customer.create({
      data: {
        name: 'Carol Smith',
        email: 'carol.smith@example.com',
        accountAgeDays: 400,
        tier: Tier.PREMIUM,
        totalOrders: 18,
        fraudFlags: 0,
        orders: {
          create: {
            productName: 'Professional Camera Lens',
            productSku: 'PHOT-PCL-003',
            amount: 799.00,
            status: OrderStatus.DELIVERED,
            isFinalSale: false,
            orderDate: daysAgo(20),
            deliveredDate: daysAgo(16),
            itemCondition: ItemCondition.DAMAGED,
          },
        },
      },
    }),

    // 4. David Lee — Standard, 45-day-old delivery (outside 30-day window) → DENY
    prisma.customer.create({
      data: {
        name: 'David Lee',
        email: 'david.lee@example.com',
        accountAgeDays: 260,
        tier: Tier.STANDARD,
        totalOrders: 8,
        fraudFlags: 0,
        orders: {
          create: {
            productName: 'Bluetooth Speaker',
            productSku: 'ELEC-BTS-004',
            amount: 89.99,
            status: OrderStatus.DELIVERED,
            isFinalSale: false,
            orderDate: daysAgo(50),
            deliveredDate: daysAgo(45),
            itemCondition: ItemCondition.GOOD,
          },
        },
      },
    }),

    // 5. Emma Wilson — Standard, incorrect item received → APPROVE
    prisma.customer.create({
      data: {
        name: 'Emma Wilson',
        email: 'emma.wilson@example.com',
        accountAgeDays: 310,
        tier: Tier.STANDARD,
        totalOrders: 11,
        fraudFlags: 0,
        orders: {
          create: {
            productName: 'Running Shoes (Size 8)',
            productSku: 'FOOT-RS8-005',
            amount: 120.00,
            status: OrderStatus.DELIVERED,
            isFinalSale: false,
            orderDate: daysAgo(12),
            deliveredDate: daysAgo(9),
            itemCondition: ItemCondition.INCORRECT,
          },
        },
      },
    }),

    // 6. Frank Chen — Standard, 3 refund requests in 30 days → ESCALATE (fraud signal)
    prisma.customer.create({
      data: {
        name: 'Frank Chen',
        email: 'frank.chen@example.com',
        accountAgeDays: 95,
        tier: Tier.STANDARD,
        totalOrders: 4,
        fraudFlags: 1,
        orders: {
          create: {
            productName: 'Smart Watch',
            productSku: 'ELEC-SWT-006',
            amount: 199.99,
            status: OrderStatus.DELIVERED,
            isFinalSale: false,
            orderDate: daysAgo(8),
            deliveredDate: daysAgo(5),
            itemCondition: ItemCondition.GOOD,
          },
        },
      },
    }),

    // 7. Grace Kim — VIP, 40-day-old delivery (within 45-day VIP window) → APPROVE
    prisma.customer.create({
      data: {
        name: 'Grace Kim',
        email: 'grace.kim@example.com',
        accountAgeDays: 900,
        tier: Tier.VIP,
        totalOrders: 56,
        fraudFlags: 0,
        orders: {
          create: {
            productName: 'Silk Blouse',
            productSku: 'APP-SB-007',
            amount: 145.00,
            status: OrderStatus.DELIVERED,
            isFinalSale: false,
            orderDate: daysAgo(44),
            deliveredDate: daysAgo(40),
            itemCondition: ItemCondition.GOOD,
          },
        },
      },
    }),

    // 8. Henry Brown — Standard, cancelled order with payment → APPROVE (auto)
    prisma.customer.create({
      data: {
        name: 'Henry Brown',
        email: 'henry.brown@example.com',
        accountAgeDays: 150,
        tier: Tier.STANDARD,
        totalOrders: 3,
        fraudFlags: 0,
        orders: {
          create: {
            productName: 'Ergonomic Office Chair',
            productSku: 'FURN-EOC-008',
            amount: 320.00,
            status: OrderStatus.CANCELLED,
            isFinalSale: false,
            orderDate: daysAgo(5),
            deliveredDate: null,
            itemCondition: ItemCondition.GOOD,
          },
        },
      },
    }),

    // 9. Isabel Davis — Standard, customer-damaged item → DENY
    prisma.customer.create({
      data: {
        name: 'Isabel Davis',
        email: 'isabel.davis@example.com',
        accountAgeDays: 200,
        tier: Tier.STANDARD,
        totalOrders: 7,
        fraudFlags: 0,
        orders: {
          create: {
            productName: 'Ceramic Dinner Set',
            productSku: 'HOME-CDS-009',
            amount: 78.00,
            status: OrderStatus.DELIVERED,
            isFinalSale: false,
            orderDate: daysAgo(18),
            deliveredDate: daysAgo(15),
            itemCondition: ItemCondition.CUSTOMER_DAMAGED,
          },
        },
      },
    }),

    // 10. James Taylor — Standard, change of mind, non-final-sale, within window → APPROVE
    prisma.customer.create({
      data: {
        name: 'James Taylor',
        email: 'james.taylor@example.com',
        accountAgeDays: 430,
        tier: Tier.STANDARD,
        totalOrders: 14,
        fraudFlags: 0,
        orders: {
          create: {
            productName: 'Hardcover Novel Collection',
            productSku: 'BOOK-HNC-010',
            amount: 55.00,
            status: OrderStatus.DELIVERED,
            isFinalSale: false,
            orderDate: daysAgo(20),
            deliveredDate: daysAgo(17),
            itemCondition: ItemCondition.GOOD,
          },
        },
      },
    }),

    // 11. Karen White — Premium, story contradicts order record (claims damaged, record says good) → ESCALATE
    prisma.customer.create({
      data: {
        name: 'Karen White',
        email: 'karen.white@example.com',
        accountAgeDays: 520,
        tier: Tier.PREMIUM,
        totalOrders: 22,
        fraudFlags: 0,
        orders: {
          create: {
            productName: 'Luxury Handbag',
            productSku: 'ACC-LHB-011',
            amount: 450.00,
            status: OrderStatus.DELIVERED,
            isFinalSale: false,
            orderDate: daysAgo(15),
            deliveredDate: daysAgo(11),
            itemCondition: ItemCondition.GOOD, // record says good — AI should flag contradiction
          },
        },
      },
    }),

    // 12. Liam Anderson — Standard, will attempt prompt injection → ESCALATE
    prisma.customer.create({
      data: {
        name: 'Liam Anderson',
        email: 'liam.anderson@example.com',
        accountAgeDays: 45,
        tier: Tier.STANDARD,
        totalOrders: 2,
        fraudFlags: 0,
        orders: {
          create: {
            productName: 'Gaming Keyboard',
            productSku: 'ELEC-GKB-012',
            amount: 110.00,
            status: OrderStatus.DELIVERED,
            isFinalSale: false,
            orderDate: daysAgo(7),
            deliveredDate: daysAgo(4),
            itemCondition: ItemCondition.GOOD,
          },
        },
      },
    }),

    // 13. Mia Thomas — Standard, $499 order, ambiguous description → AI decides
    prisma.customer.create({
      data: {
        name: 'Mia Thomas',
        email: 'mia.thomas@example.com',
        accountAgeDays: 380,
        tier: Tier.STANDARD,
        totalOrders: 9,
        fraudFlags: 0,
        orders: {
          create: {
            productName: 'Espresso Machine',
            productSku: 'KITCH-ESM-013',
            amount: 499.00,
            status: OrderStatus.DELIVERED,
            isFinalSale: false,
            orderDate: daysAgo(22),
            deliveredDate: daysAgo(18),
            itemCondition: ItemCondition.DAMAGED,
          },
        },
      },
    }),

    // 14. Noah Jackson — Standard, order still pending (not delivered), claims not arrived → DENY
    prisma.customer.create({
      data: {
        name: 'Noah Jackson',
        email: 'noah.jackson@example.com',
        accountAgeDays: 120,
        tier: Tier.STANDARD,
        totalOrders: 3,
        fraudFlags: 0,
        orders: {
          create: {
            productName: 'Mechanical Keyboard',
            productSku: 'ELEC-MKB-014',
            amount: 165.00,
            status: OrderStatus.PENDING,
            isFinalSale: false,
            orderDate: daysAgo(3),
            deliveredDate: null,
            itemCondition: ItemCondition.GOOD,
          },
        },
      },
    }),

    // 15. Olivia Harris — VIP, high value + suspicious pattern → ESCALATE
    prisma.customer.create({
      data: {
        name: 'Olivia Harris',
        email: 'olivia.harris@example.com',
        accountAgeDays: 800,
        tier: Tier.VIP,
        totalOrders: 41,
        fraudFlags: 2,
        orders: {
          create: {
            productName: 'Designer Watch',
            productSku: 'ACC-DW-015',
            amount: 1200.00,
            status: OrderStatus.DELIVERED,
            isFinalSale: false,
            orderDate: daysAgo(25),
            deliveredDate: daysAgo(20),
            itemCondition: ItemCondition.GOOD,
          },
        },
      },
    }),
  ]);

  console.log(`✅ Created ${customers.length} customers with orders.`);

  // ── Add prior refund requests for Frank Chen (to trigger fraud signal) ─────
  const frankChen = customers[5]; // index 5 = Frank Chen
  const frankOrders = await prisma.order.findMany({ where: { customerId: frankChen.id } });

  // Create 3 prior refund requests in the last 30 days to trigger the threshold
  await prisma.refundRequest.createMany({
    data: [
      {
        customerId: frankChen.id,
        orderId: frankOrders[0].id,
        message: 'Item was not as described',
        decision: 'DENIED',
        aiReasoning: 'Item condition was good, no valid reason for refund.',
        aiConfidence: 0.85,
        policyCitations: ['Rule 4: ITEM CONDITIONS'],
        policyFlags: [],
        amountRequested: 199.99,
      },
    ],
  });

  console.log('✅ Added prior refund history for Frank Chen (fraud signal test).');
  console.log('\n🎉 Seed complete! All 15 customer scenarios are ready.\n');
  console.log('Scenarios covered:');
  console.log('  1. Alice Johnson    → VIP + damaged item     → APPROVE');
  console.log('  2. Bob Martinez     → Final sale              → DENY');
  console.log('  3. Carol Smith      → Premium + $799         → ESCALATE (high value)');
  console.log('  4. David Lee        → Expired window          → DENY');
  console.log('  5. Emma Wilson      → Incorrect item          → APPROVE');
  console.log('  6. Frank Chen       → Excessive requests      → ESCALATE (fraud)');
  console.log('  7. Grace Kim        → VIP extended window     → APPROVE');
  console.log('  8. Henry Brown      → Cancelled order         → APPROVE (auto)');
  console.log('  9. Isabel Davis     → Customer damage         → DENY');
  console.log(' 10. James Taylor     → Change of mind          → APPROVE');
  console.log(' 11. Karen White      → Contradicting story     → ESCALATE (AI)');
  console.log(' 12. Liam Anderson    → Prompt injection        → ESCALATE');
  console.log(' 13. Mia Thomas       → Borderline $499         → AI decides');
  console.log(' 14. Noah Jackson     → Pending order           → DENY (auto)');
  console.log(' 15. Olivia Harris    → VIP + high value + flags → ESCALATE');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
