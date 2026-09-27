'use client';

import { cn, decisionColor, decisionBorder, decisionIcon, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import type { Decision, RefundResponse } from '@/lib/api';

interface DecisionCardProps {
  result: RefundResponse;
  onReset: () => void;
}

const headings: Record<Decision, string> = {
  APPROVED:  'Refund Approved',
  DENIED:    'Refund Denied',
  ESCALATED: 'Under Review',
  PENDING:   'Processing',
};

const subtext: Record<Decision, string> = {
  APPROVED:  'Your refund will be processed within 3–5 business days.',
  DENIED:    'Your request did not meet the criteria for a refund.',
  ESCALATED: 'Your case has been escalated to our support team for manual review.',
  PENDING:   'Your request is being processed.',
};

export function DecisionCard({ result, onReset }: DecisionCardProps) {
  const { decision, reasoning, policyCitations, flags, confidenceScore, amountRequested } = result;

  return (
    <div className={cn(
      'border-l-4 border border-border bg-white animate-fade-in',
      decisionBorder(decision),
    )}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4">
        <div>
          <p className="label-uppercase mb-1">Decision</p>
          <h2 className="text-2xl font-bold text-ink tracking-tight">{headings[decision]}</h2>
          <p className="text-ink-2 text-sm mt-1">{subtext[decision]}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Badge className={decisionColor(decision)}>
            {decisionIcon(decision)} {decision}
          </Badge>
          <span className="text-xl font-bold text-ink">{formatCurrency(amountRequested)}</span>
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="px-6 py-5 border-b border-border">
        <p className="label-uppercase mb-2">AI Reasoning</p>
        <p className="text-ink text-sm leading-relaxed">{reasoning}</p>
      </div>

      {/* Policy Citations + Flags */}
      <div className="px-6 py-5 border-b border-border grid grid-cols-1 sm:grid-cols-2 gap-5">
        {policyCitations.length > 0 && (
          <div>
            <p className="label-uppercase mb-2">Policy Rules Applied</p>
            <div className="flex flex-wrap gap-1.5">
              {policyCitations.map((c, i) => (
                <span key={i} className="text-[11px] font-mono px-2 py-1 bg-cream border border-border text-ink-2">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
        {flags.length > 0 && (
          <div>
            <p className="label-uppercase mb-2">Flags Detected</p>
            <div className="flex flex-wrap gap-1.5">
              {flags.map((f, i) => (
                <span key={i} className="text-[11px] font-medium px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800">
                  {f.replaceAll('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 flex items-center justify-between">
        {confidenceScore !== null ? (
          <div className="flex items-center gap-3">
            <p className="label-uppercase">AI Confidence</p>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1 bg-border rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', {
                    'bg-emerald-500': confidenceScore >= 0.8,
                    'bg-amber-500':   confidenceScore >= 0.6 && confidenceScore < 0.8,
                    'bg-red-500':     confidenceScore < 0.6,
                  })}
                  style={{ width: `${confidenceScore * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-ink">{(confidenceScore * 100).toFixed(0)}%</span>
            </div>
          </div>
        ) : <span />}

        <button
          onClick={onReset}
          className="text-xs font-semibold uppercase tracking-widest text-orange hover:text-orange-dark transition-colors"
        >
          New Request →
        </button>
      </div>
    </div>
  );
}
