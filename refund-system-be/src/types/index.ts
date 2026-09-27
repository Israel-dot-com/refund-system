// Shared TypeScript types across the backend

export type Tier = 'STANDARD' | 'PREMIUM' | 'VIP';
export type OrderStatus = 'PENDING' | 'DELIVERED' | 'CANCELLED';
export type ItemCondition = 'GOOD' | 'DAMAGED' | 'INCORRECT' | 'CUSTOMER_DAMAGED';
export type Decision = 'PENDING' | 'APPROVED' | 'DENIED' | 'ESCALATED';

export interface CustomerContext {
  id: string;
  name: string;
  email: string;
  tier: Tier;
  accountAgeDays: number;
  totalOrders: number;
  fraudFlags: number;
  recentRefundCount: number; // computed: refund requests in last 30 days
}

export interface OrderContext {
  id: string;
  productName: string;
  productSku: string;
  amount: number;
  status: OrderStatus;
  isFinalSale: boolean;
  orderDate: Date;
  deliveredDate: Date | null;
  itemCondition: ItemCondition;
  daysSinceDelivery: number | null;
}

export interface PolicyPreflightResult {
  passed: boolean;
  hardDecision: Decision | null; // if not null, skip AI
  flags: string[];
  reason: string | null;
}

export interface AIDecisionResult {
  decision: Decision;
  reasoning: string;
  policyCitations: string[];
  confidenceScore: number;
  flags: string[];
}

export interface RefundRequestPayload {
  customerId: string;
  orderId: string;
  message: string;
}

export interface RefundResponse {
  requestId: string;
  decision: Decision;
  reasoning: string;
  policyCitations: string[];
  flags: string[];
  confidenceScore: number | null;
  amountRequested: number;
}
