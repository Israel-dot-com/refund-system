'use client';

import { useState } from 'react';
import { decisionColor, decisionIcon, formatCurrency, formatDateTime, tierBadgeClass, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { overrideRequest } from '@/lib/api';
import type { AdminRequest, Decision } from '@/lib/api';

interface AdminTableProps {
  requests: AdminRequest[];
  onRowClick: (id: string) => void;
  onOverride?: () => void;
}

export function AdminTable({ requests, onRowClick, onOverride }: AdminTableProps) {
  const [overriding, setOverriding] = useState<string | null>(null);
  const [overrideDecision, setOverrideDecision] = useState<'APPROVED' | 'DENIED'>('APPROVED');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleOverride(id: string) {
    if (overrideReason.trim().length < 5) return;
    setSubmitting(true);
    try {
      await overrideRequest(id, overrideDecision, overrideReason.trim());
      setOverriding(null);
      setOverrideReason('');
      onOverride?.();
    } finally {
      setSubmitting(false);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-ink-2">
        <p className="label-uppercase mb-2">No requests</p>
        <p className="text-sm">No refund requests match the current filter.</p>
      </div>
    );
  }

  const thClass = 'px-4 py-3 text-left label-uppercase';
  const tdClass = 'px-4 py-3 text-sm';

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-border bg-cream">
          <tr>
            <th className={thClass}>Customer</th>
            <th className={thClass}>Product</th>
            <th className={thClass}>Amount</th>
            <th className={thClass}>Decision</th>
            <th className={thClass}>Confidence</th>
            <th className={thClass}>Submitted</th>
            <th className={thClass}></th>
          </tr>
        </thead>
        <tbody>
          {requests.map(req => (
            <>
              <tr
                key={req.id}
                onClick={() => onRowClick(req.id)}
                className="border-b border-border hover:bg-cream cursor-pointer transition-colors group"
              >
                <td className={tdClass}>
                  <p className="font-medium text-ink group-hover:text-orange transition-colors">{req.customer.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge className={tierBadgeClass(req.customer.tier)}>{req.customer.tier}</Badge>
                  </div>
                </td>
                <td className={tdClass}>
                  <p className="text-ink">{req.order.productName}</p>
                  {req.order.isFinalSale && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-red-600">Final Sale</span>
                  )}
                </td>
                <td className={cn(tdClass, 'font-semibold text-ink tabular-nums')}>
                  {formatCurrency(req.amountRequested)}
                </td>
                <td className={tdClass}>
                  <Badge className={decisionColor(req.decision)}>
                    {decisionIcon(req.decision)} {req.decision}
                  </Badge>
                </td>
                <td className={tdClass}>
                  {req.aiConfidence !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1 bg-cream-dark rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', {
                            'bg-emerald-500': req.aiConfidence >= 0.8,
                            'bg-amber-500':   req.aiConfidence >= 0.6 && req.aiConfidence < 0.8,
                            'bg-red-500':     req.aiConfidence < 0.6,
                          })}
                          style={{ width: `${req.aiConfidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-ink-2">{(req.aiConfidence * 100).toFixed(0)}%</span>
                    </div>
                  ) : (
                    <span className="text-ink-2">—</span>
                  )}
                </td>
                <td className={cn(tdClass, 'text-ink-2 text-xs tabular-nums')}>
                  {formatDateTime(req.createdAt)}
                </td>
                <td className={tdClass} onClick={e => e.stopPropagation()}>
                  {(req.decision === 'ESCALATED' || req.decision === 'PENDING') && (
                    <button
                      onClick={() => setOverriding(overriding === req.id ? null : req.id)}
                      className="text-[10px] font-semibold uppercase tracking-widest text-orange hover:text-orange-dark transition-colors"
                    >
                      Override
                    </button>
                  )}
                </td>
              </tr>

              {/* Inline override row */}
              {overriding === req.id && (
                <tr key={`override-${req.id}`} className="border-b border-border bg-amber-50">
                  <td colSpan={7} className="px-4 py-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <p className="label-uppercase mb-1">Decision</p>
                        <select
                          className="bg-white border border-border px-2 py-1.5 text-sm text-ink focus:outline-none"
                          value={overrideDecision}
                          onChange={e => setOverrideDecision(e.target.value as 'APPROVED' | 'DENIED')}
                        >
                          <option value="APPROVED">Approve</option>
                          <option value="DENIED">Deny</option>
                        </select>
                      </div>
                      <div className="flex-1 min-w-48">
                        <p className="label-uppercase mb-1">Reason</p>
                        <input
                          type="text"
                          className="w-full bg-white border border-border px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-orange"
                          placeholder="Reason for manual override…"
                          value={overrideReason}
                          onChange={e => setOverrideReason(e.target.value)}
                        />
                      </div>
                      <Button size="sm" loading={submitting} onClick={() => handleOverride(req.id)} disabled={overrideReason.trim().length < 5}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setOverriding(null); setOverrideReason(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
