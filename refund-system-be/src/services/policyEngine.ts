import type { CustomerContext, OrderContext, PolicyPreflightResult, Decision } from '../types';

/**
 * Refund policy constants.
 * VIP/PREMIUM get extended windows and higher escalation thresholds.
 */
const POLICY = {
  STANDARD_WINDOW_DAYS: 30,
  PREMIUM_VIP_WINDOW_DAYS: 45,
  STANDARD_ESCALATION_THRESHOLD: 500,
  PREMIUM_VIP_ESCALATION_THRESHOLD: 750,
  FRAUD_REFUND_COUNT_THRESHOLD: 2, // >2 refunds in 30 days = escalate
  LOW_CONFIDENCE_THRESHOLD: 0.6,   // AI confidence below this → escalate
};

/**
 * Pre-flight policy engine.
 * Runs BEFORE the AI call. Handles the hard/unambiguous cases fast.
 * Returns a hard decision if one applies, otherwise passes through to AI.
 */
export function runPreflightPolicy(
  customer: CustomerContext,
  order: OrderContext,
): PolicyPreflightResult {
  const flags: string[] = [];

  // ── Rule 1: Final sale items are never refundable ──────────────────────────
  if (order.isFinalSale) {
    return {
      passed: false,
      hardDecision: 'DENIED',
      flags: ['FINAL_SALE'],
      reason: 'This item was marked as a final sale and is not eligible for a refund.',
    };
  }

  // ── Rule 2: Order must be delivered before a refund can be requested ───────
  if (order.status === 'PENDING') {
    return {
      passed: false,
      hardDecision: 'DENIED',
      flags: ['ORDER_NOT_DELIVERED'],
      reason: 'The order has not been delivered yet. Please wait for delivery before requesting a refund.',
    };
  }

  // ── Rule 3: Cancelled orders with payment collected are auto-approved ──────
  if (order.status === 'CANCELLED') {
    return {
      passed: false,
      hardDecision: 'APPROVED',
      flags: ['CANCELLED_ORDER_AUTO_APPROVE'],
      reason: 'Cancelled orders are automatically eligible for a full refund.',
    };
  }

  // ── Rule 4: Time window check ──────────────────────────────────────────────
  const windowDays =
    customer.tier === 'VIP' || customer.tier === 'PREMIUM'
      ? POLICY.PREMIUM_VIP_WINDOW_DAYS
      : POLICY.STANDARD_WINDOW_DAYS;

  if (order.daysSinceDelivery !== null && order.daysSinceDelivery > windowDays) {
    return {
      passed: false,
      hardDecision: 'DENIED',
      flags: ['OUTSIDE_REFUND_WINDOW'],
      reason: `Your refund window of ${windowDays} days has expired. The order was delivered ${order.daysSinceDelivery} days ago.`,
    };
  }

  // ── Rule 5: High-value orders require human review ─────────────────────────
  const escalationThreshold =
    customer.tier === 'VIP' || customer.tier === 'PREMIUM'
      ? POLICY.PREMIUM_VIP_ESCALATION_THRESHOLD
      : POLICY.STANDARD_ESCALATION_THRESHOLD;

  if (order.amount > escalationThreshold) {
    flags.push('HIGH_VALUE_ORDER');
  }

  // ── Rule 6: Fraud signal — too many recent refund requests ────────────────
  if (customer.recentRefundCount > POLICY.FRAUD_REFUND_COUNT_THRESHOLD) {
    return {
      passed: false,
      hardDecision: 'ESCALATED',
      flags: ['EXCESSIVE_REFUND_REQUESTS', ...flags],
      reason: `This account has submitted ${customer.recentRefundCount} refund requests in the last 30 days. The request has been escalated for manual review.`,
    };
  }

  // ── Rule 7: Existing fraud flags on account ────────────────────────────────
  if (customer.fraudFlags > 0) {
    flags.push('ACCOUNT_HAS_FRAUD_FLAGS');
  }

  // All hard rules passed — send to AI with collected flags
  return {
    passed: true,
    hardDecision: null,
    flags,
    reason: null,
  };
}

/**
 * Post-flight validation.
 * Runs AFTER the AI call. Ensures the AI cannot override hard business rules.
 * This is the safety net — AI can never approve a final sale, etc.
 */
export function runPostflightValidation(
  aiDecision: Decision,
  customer: CustomerContext,
  order: OrderContext,
  aiConfidence: number,
): { finalDecision: Decision; overrideReason: string | null } {
  // Hard override: final sale can NEVER be approved
  if (order.isFinalSale && aiDecision === 'APPROVED') {
    return {
      finalDecision: 'DENIED',
      overrideReason: 'Policy override: Final sale items cannot be approved regardless of AI decision.',
    };
  }

  // Hard override: expired time window cannot be approved
  const windowDays =
    customer.tier === 'VIP' || customer.tier === 'PREMIUM'
      ? POLICY.PREMIUM_VIP_WINDOW_DAYS
      : POLICY.STANDARD_WINDOW_DAYS;

  if (
    order.daysSinceDelivery !== null &&
    order.daysSinceDelivery > windowDays &&
    aiDecision === 'APPROVED'
  ) {
    return {
      finalDecision: 'DENIED',
      overrideReason: 'Policy override: Refund window has expired. Cannot approve.',
    };
  }

  // Hard override: high-value orders must be escalated
  const escalationThreshold =
    customer.tier === 'VIP' || customer.tier === 'PREMIUM'
      ? POLICY.PREMIUM_VIP_ESCALATION_THRESHOLD
      : POLICY.STANDARD_ESCALATION_THRESHOLD;

  if (order.amount > escalationThreshold && aiDecision === 'APPROVED') {
    return {
      finalDecision: 'ESCALATED',
      overrideReason: `Policy override: Orders over $${escalationThreshold} require human review.`,
    };
  }

  // Low AI confidence → escalate regardless of decision
  if (aiConfidence < POLICY.LOW_CONFIDENCE_THRESHOLD && aiDecision !== 'DENIED') {
    return {
      finalDecision: 'ESCALATED',
      overrideReason: `Policy override: AI confidence score (${(aiConfidence * 100).toFixed(0)}%) is below threshold. Escalating for human review.`,
    };
  }

  return { finalDecision: aiDecision, overrideReason: null };
}

export { POLICY };
