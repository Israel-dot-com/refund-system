import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin-secret-key';

export const api = axios.create({ baseURL: API_BASE });
export const adminApi = axios.create({
  baseURL: API_BASE,
  headers: { 'x-admin-api-key': ADMIN_KEY },
});

// ── Customer endpoints ─────────────────────────────────────────────────────
export async function getCustomers() {
  const { data } = await api.get('/api/customers');
  return data as Customer[];
}

export async function getCustomerOrders(customerId: string) {
  const { data } = await api.get(`/api/customers/${customerId}/orders`);
  return data as { customer: Customer; orders: Order[] };
}

// ── Refund endpoints ───────────────────────────────────────────────────────
export async function submitRefund(payload: {
  customerId: string;
  orderId: string;
  message: string;
}) {
  const { data } = await api.post('/api/refund/submit', payload);
  return data as RefundResponse;
}

// ── Admin endpoints ────────────────────────────────────────────────────────
export async function getAdminStats() {
  const { data } = await adminApi.get('/api/admin/stats');
  return data as AdminStats;
}

export async function getAdminRequests(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const { data } = await adminApi.get('/api/admin/requests', { params });
  return data as AdminRequestsResponse;
}

export async function getAdminRequest(id: string) {
  const { data } = await adminApi.get(`/api/admin/requests/${id}`);
  return data as RefundRequestDetail;
}

export async function overrideRequest(
  id: string,
  decision: 'APPROVED' | 'DENIED',
  override_reason: string,
) {
  const { data } = await adminApi.patch(`/api/admin/requests/${id}`, {
    decision,
    override_reason,
  });
  return data;
}

// ── Shared types ───────────────────────────────────────────────────────────
export type Tier = 'STANDARD' | 'PREMIUM' | 'VIP';
export type Decision = 'PENDING' | 'APPROVED' | 'DENIED' | 'ESCALATED';
export type OrderStatus = 'PENDING' | 'DELIVERED' | 'CANCELLED';
export type ItemCondition = 'GOOD' | 'DAMAGED' | 'INCORRECT' | 'CUSTOMER_DAMAGED';

export interface Customer {
  id: string;
  name: string;
  email: string;
  tier: Tier;
  totalOrders: number;
}

export interface Order {
  id: string;
  productName: string;
  productSku: string;
  amount: number;
  status: OrderStatus;
  isFinalSale: boolean;
  orderDate: string;
  deliveredDate: string | null;
  itemCondition: ItemCondition;
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

export interface AdminStats {
  total: number;
  approved: number;
  denied: number;
  escalated: number;
  pending: number;
  avgConfidence: number | null;
}

export interface AdminRequest {
  id: string;
  decision: Decision;
  message: string;
  amountRequested: number;
  aiConfidence: number | null;
  policyFlags: string[];
  createdAt: string;
  customer: { name: string; email: string; tier: Tier };
  order: { productName: string; amount: number; status: OrderStatus; isFinalSale: boolean };
}

export interface AdminRequestsResponse {
  data: AdminRequest[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface AuditLog {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface RefundRequestDetail extends AdminRequest {
  aiReasoning: string | null;
  policyCitations: string[];
  overrideReason: string | null;
  updatedAt: string;
  auditLogs: AuditLog[];
  customer: { id: string; name: string; email: string; tier: Tier; accountAgeDays: number; totalOrders: number; fraudFlags: number };
  order: Order & { customerId: string };
}
