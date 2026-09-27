import type { AdminStats } from '@/lib/api';

interface StatsCardsProps { stats: AdminStats }

export function StatsCards({ stats }: StatsCardsProps) {
  const items = [
    { label: 'Total',     value: stats.total,    note: null },
    { label: 'Approved',  value: stats.approved,  note: stats.total ? `${((stats.approved / stats.total) * 100).toFixed(0)}%` : null },
    { label: 'Denied',    value: stats.denied,    note: stats.total ? `${((stats.denied / stats.total) * 100).toFixed(0)}%` : null },
    { label: 'Escalated', value: stats.escalated, note: stats.total ? `${((stats.escalated / stats.total) * 100).toFixed(0)}%` : null },
    { label: 'Pending',   value: stats.pending,   note: null },
    {
      label: 'Avg. AI Confidence',
      value: stats.avgConfidence !== null ? `${(stats.avgConfidence * 100).toFixed(0)}%` : '—',
      note: null,
    },
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 border border-border divide-x divide-y lg:divide-y-0 divide-border">
      {items.map(item => (
        <div key={item.label} className="bg-white px-5 py-5">
          <p className="label-uppercase mb-2">{item.label}</p>
          <p className="text-3xl font-bold text-ink tracking-tight leading-none">{item.value}</p>
          {item.note && (
            <p className="text-[10px] text-ink-2 mt-1 font-medium">{item.note} of total</p>
          )}
        </div>
      ))}
    </div>
  );
}
