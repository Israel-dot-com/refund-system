import { formatDateTime } from '@/lib/utils';
import type { AuditLog } from '@/lib/api';

const EVENT_META: Record<string, { label: string; icon: string }> = {
  REFUND_PROCESSED: { label: 'AI Decision', icon: '◆' },
  HUMAN_OVERRIDE:   { label: 'Human Override', icon: '◇' },
};

function getMeta(eventType: string) {
  return EVENT_META[eventType] ?? { label: eventType.replace(/_/g, ' '), icon: '·' };
}

export function AuditTimeline({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0)
    return <p className="text-xs text-ink-2 italic">No audit events recorded.</p>;

  return (
    <div className="space-y-0">
      {logs.map((log, i) => {
        const { label, icon } = getMeta(log.eventType);
        return (
          <div key={log.id} className="flex gap-4 py-4 border-b border-border last:border-0">
            {/* Icon + line */}
            <div className="flex flex-col items-center">
              <span className="text-orange font-bold text-sm shrink-0">{icon}</span>
              {i < logs.length - 1 && (
                <div className="flex-1 w-px bg-border mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink">{label}</p>
                <p className="text-[10px] text-ink-2 shrink-0">{formatDateTime(log.createdAt)}</p>
              </div>
              <pre className="text-[10px] font-mono text-ink-2 bg-cream border border-border px-3 py-2 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          </div>
        );
      })}
    </div>
  );
}
