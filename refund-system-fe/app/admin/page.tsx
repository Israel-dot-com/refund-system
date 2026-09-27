'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAdminStats, getAdminRequests } from '@/lib/api';
import { StatsCards } from '@/components/StatsCards';
import { AdminTable } from '@/components/AdminTable';
import { RequestDrawer } from '@/components/RequestDrawer';
import { Button } from '@/components/ui/Button';
import type { AdminStats, AdminRequest, Decision } from '@/lib/api';
import { RefreshCw } from 'lucide-react';

const FILTERS: Array<{ label: string; value: Decision | '' }> = [
  { label: 'All',       value: '' },
  { label: 'Approved',  value: 'APPROVED' },
  { label: 'Denied',    value: 'DENIED' },
  { label: 'Escalated', value: 'ESCALATED' },
  { label: 'Pending',   value: 'PENDING' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState<Decision | ''>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [statsData, reqData] = await Promise.all([
        getAdminStats(),
        getAdminRequests({ page, limit: 20, status: filter || undefined }),
      ]);
      setStats(statsData);
      setRequests(reqData.data);
      setTotal(reqData.pagination.total);
      setPages(reqData.pagination.pages);
    } catch {
      setError('Unable to connect to the backend. Make sure the API is running on port 4000.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, filter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => loadData(true), 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="min-h-screen bg-cream">
      {/* ── Page header ── */}
      <div className="max-w-screen-xl mx-auto px-6 lg:px-10 pt-14 pb-10 border-b border-border">
        <p className="label-uppercase mb-3">Admin</p>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <h1 className="display-heading">Support Dashboard</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-2">
              {total > 0 ? `${total} request${total !== 1 ? 's' : ''}` : ''}
            </span>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-ink-2 hover:text-ink transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 lg:px-10 py-10 space-y-8">

        {/* Error state */}
        {error && (
          <div className="border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 flex items-center gap-3">
            <span className="font-bold">⚠</span> {error}
          </div>
        )}

        {/* Stats */}
        {stats ? (
          <StatsCards stats={stats} />
        ) : !error ? (
          <div className="grid grid-cols-3 lg:grid-cols-6 border border-border divide-x divide-border">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white px-5 py-5 animate-pulse">
                <div className="h-2 w-12 bg-cream-dark rounded mb-3" />
                <div className="h-7 w-10 bg-cream-dark rounded" />
              </div>
            ))}
          </div>
        ) : null}

        {/* Requests table */}
        <div className="border border-border bg-white">
          {/* Table header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
            <p className="font-semibold text-ink text-sm">Refund Requests</p>
            {/* Filter pills */}
            <div className="flex items-center gap-0 border border-border">
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => { setFilter(f.value); setPage(1); }}
                  className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest border-r border-border last:border-0 transition-colors ${
                    filter === f.value
                      ? 'bg-ink text-white'
                      : 'text-ink-2 hover:text-ink hover:bg-cream'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-ink-2">
                <div className="w-6 h-6 border-2 border-orange border-t-transparent rounded-full animate-spin" />
                <p className="label-uppercase">Loading</p>
              </div>
            </div>
          ) : (
            <AdminTable
              requests={requests}
              onRowClick={setSelectedId}
              onOverride={() => loadData(true)}
            />
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <p className="label-uppercase">Page {page} of {pages}</p>
              <div className="flex gap-0 border border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="border-r border-border rounded-none"
                >
                  ← Prev
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= pages}
                  onClick={() => setPage(p => p + 1)}
                  className="rounded-none"
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Request detail drawer */}
      <RequestDrawer
        requestId={selectedId}
        onClose={() => setSelectedId(null)}
        onOverride={() => loadData(true)}
      />
    </div>
  );
}
