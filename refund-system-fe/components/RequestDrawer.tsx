'use client';

import { useEffect, useState } from 'react';
import { getAdminRequest, overrideRequest } from '@/lib/api';
import { AuditTimeline } from './AuditTimeline';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import {
  decisionColor, decisionIcon, decisionBorder,
  formatCurrency, formatDate, tierBadgeClass, cn,
} from '@/lib/utils';
import type { RefundRequestDetail } from '@/lib/api';
import { X } from 'lucide-react';

interface RequestDrawerProps {
  requestId: string | null;
  onClose: () => void;
  onOverride?: () => void;
}

export function RequestDrawer({ requestId, onClose, onOverride }: RequestDrawerProps) {
  const [detail, setDetail] = useState<RefundRequestDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideDecision, setOverrideDecision] = useState<'APPROVED' | 'DENIED'>('APPROVED');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!requestId) { setDetail(null); setOverrideOpen(false); return; }
    setLoading(true);
    setDetail(null);
    getAdminRequest(requestId).then(setDetail).finally(() => setLoading(false));
  }, [requestId]);

  async function handleOverride() {
    if (!requestId || overrideReason.trim().length < 5) return;
    setSubmitting(true);
    try {
      await overrideRequest(requestId, overrideDecision, overrideReason.trim());
      const updated = await getAdminRequest(requestId);
      setDetail(updated);
      setOverrideOpen(false);
      setOverrideReason('');
      onOverride?.();
    } finally {
      setSubmitting(false);
    }
  }

  const open = requestId !== null;

  const labelClass = 'label-uppercase mb-1';

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-ink/20 z-40 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white border-l border-border flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <p className="label-uppercase">Request Detail</p>
          <button
            onClick={onClose}
            className="p-1 text-ink-2 hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="px-6 py-8 space-y-4 animate-pulse">
              {[80, 60, 100, 40, 80].map((w, i) => (
                <div key={i} className="h-3 bg-cream rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {detail && (
            <>
              {/* Decision header */}
              <div className={cn('border-l-4 border-b border-border px-6 py-5', decisionBorder(detail.decision))}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={labelClass}>Decision</p>
                    <p className="text-xl font-bold text-ink tracking-tight mt-0.5">{detail.decision}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={decisionColor(detail.decision)}>
                      {decisionIcon(detail.decision)} {detail.decision}
                    </Badge>
                    <p className="text-xl font-bold text-ink mt-2">{formatCurrency(detail.amountRequested)}</p>
                  </div>
                </div>
              </div>

              {/* Customer + Order */}
              <div className="grid grid-cols-2 gap-0 border-b border-border">
                <div className="px-6 py-5 border-r border-border">
                  <p className={labelClass}>Customer</p>
                  <p className="font-semibold text-ink mt-1">{detail.customer.name}</p>
                  <p className="text-xs text-ink-2 mt-0.5">{detail.customer.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge className={tierBadgeClass(detail.customer.tier)}>{detail.customer.tier}</Badge>
                    <span className="text-[10px] text-ink-2">{detail.customer.accountAgeDays}d · {detail.customer.totalOrders} orders · {detail.customer.fraudFlags} flags</span>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <p className={labelClass}>Order</p>
                  <p className="font-semibold text-ink mt-1">{detail.order.productName}</p>
                  <p className="text-xs text-ink-2 font-mono mt-0.5">{detail.order.productSku}</p>
                  <div className="mt-2 space-y-0.5 text-[10px] text-ink-2">
                    <p>{detail.order.status} · {detail.order.itemCondition.replaceAll('_', ' ')}</p>
                    {detail.order.deliveredDate && <p>Delivered {formatDate(detail.order.deliveredDate)}</p>}
                    {detail.order.isFinalSale && <span className="text-red-600 font-semibold uppercase">Final Sale</span>}
                  </div>
                </div>
              </div>

              {/* Customer message */}
              <div className="px-6 py-5 border-b border-border">
                <p className={labelClass}>Customer Message</p>
                <blockquote className="mt-2 text-sm text-ink leading-relaxed border-l-2 border-orange pl-3">
                  "{detail.message}"
                </blockquote>
              </div>

              {/* AI Reasoning */}
              {detail.aiReasoning && (
                <div className="px-6 py-5 border-b border-border">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <p className={labelClass}>AI Reasoning</p>
                    {detail.aiConfidence !== null && (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', {
                              'bg-emerald-500': detail.aiConfidence >= 0.8,
                              'bg-amber-500':   detail.aiConfidence >= 0.6 && detail.aiConfidence < 0.8,
                              'bg-red-500':     detail.aiConfidence < 0.6,
                            })}
                            style={{ width: `${detail.aiConfidence * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-ink">{(detail.aiConfidence * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-ink leading-relaxed">{detail.aiReasoning}</p>
                </div>
              )}

              {/* Citations + Flags */}
              {(detail.policyCitations.length > 0 || detail.policyFlags.length > 0) && (
                <div className="px-6 py-5 border-b border-border grid grid-cols-2 gap-5">
                  {detail.policyCitations.length > 0 && (
                    <div>
                      <p className={labelClass}>Policy Citations</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {detail.policyCitations.map((c, i) => (
                          <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 bg-cream border border-border text-ink-2">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {detail.policyFlags.length > 0 && (
                    <div>
                      <p className={labelClass}>Flags</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {detail.policyFlags.map((f, i) => (
                          <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800">{f.replaceAll('_', ' ')}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Override note */}
              {detail.overrideReason && (
                <div className="px-6 py-5 border-b border-border bg-amber-50">
                  <p className={labelClass}>Human Override Note</p>
                  <p className="text-sm text-ink mt-1">{detail.overrideReason}</p>
                </div>
              )}

              {/* Override panel */}
              {(detail.decision === 'ESCALATED' || detail.decision === 'PENDING') && (
                <div className="px-6 py-5 border-b border-border">
                  {!overrideOpen ? (
                    <Button variant="secondary" size="sm" onClick={() => setOverrideOpen(true)}>
                      Manual Override
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className={labelClass}>Manual Override</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] text-ink-2 mb-1">New Decision</p>
                          <select
                            className="w-full bg-white border border-border px-2 py-1.5 text-sm focus:outline-none focus:border-orange"
                            value={overrideDecision}
                            onChange={e => setOverrideDecision(e.target.value as 'APPROVED' | 'DENIED')}
                          >
                            <option value="APPROVED">Approve</option>
                            <option value="DENIED">Deny</option>
                          </select>
                        </div>
                      </div>
                      <input
                        type="text"
                        className="w-full bg-white border border-border px-2 py-1.5 text-sm focus:outline-none focus:border-orange"
                        placeholder="Reason for override (required)…"
                        value={overrideReason}
                        onChange={e => setOverrideReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" loading={submitting} disabled={overrideReason.trim().length < 5} onClick={handleOverride}>
                          Confirm Override
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setOverrideOpen(false); setOverrideReason(''); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Audit trail */}
              <div className="px-6 py-5">
                <p className={cn(labelClass, 'mb-3')}>Audit Trail</p>
                <AuditTimeline logs={detail.auditLogs} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
