'use client';

import { useState, useEffect } from 'react';
import { getCustomers, getCustomerOrders, submitRefund } from '@/lib/api';
import { formatCurrency, formatDate, daysSince, tierBadgeClass } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { DecisionCard } from '@/components/DecisionCard';
import { Badge } from '@/components/ui/Badge';
import type { Customer, Order, RefundResponse } from '@/lib/api';

export function RefundRequestForm() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingOrders, setFetchingOrders] = useState(false);
  const [result, setResult] = useState<RefundResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    getCustomers()
      .then(setCustomers)
      .catch(() => setLoadError(true));
  }, []);

  async function onCustomerChange(customerId: string) {
    const customer = customers.find(c => c.id === customerId) ?? null;
    setSelectedCustomer(customer);
    setSelectedOrder(null);
    setOrders([]);
    if (!customerId) return;
    setFetchingOrders(true);
    try {
      const { orders } = await getCustomerOrders(customerId);
      setOrders(orders);
    } catch {
      setError('Failed to load orders. Please try again.');
    } finally {
      setFetchingOrders(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer || !selectedOrder || message.trim().length < 10) return;
    setLoading(true);
    setError(null);
    try {
      const res = await submitRefund({
        customerId: selectedCustomer.id,
        orderId: selectedOrder.id,
        message: message.trim(),
      });
      setResult(res);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr?.response?.data?.error ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setSelectedOrder(null);
    setMessage('');
    setError(null);
  }

  if (result) return <DecisionCard result={result} onReset={reset} />;

  const inputClass =
    'w-full bg-cream border-0 border-b border-border px-0 py-2.5 text-sm text-ink placeholder:text-ink-2 focus:outline-none focus:border-orange transition-colors';
  const labelClass = 'block label-uppercase mb-1';

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {loadError && (
        <p className="text-sm text-red-600">⚠ Unable to connect to the API. Make sure the backend is running on port 4000.</p>
      )}

      {/* ── Customer ── */}
      <div>
        <label className={labelClass}>Account</label>
        <select
          className={inputClass}
          value={selectedCustomer?.id ?? ''}
          onChange={e => onCustomerChange(e.target.value)}
          required
        >
          <option value="">Select customer account…</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.email}
            </option>
          ))}
        </select>

        {selectedCustomer && (
          <div className="mt-2 flex items-center gap-2">
            <Badge className={tierBadgeClass(selectedCustomer.tier)}>
              {selectedCustomer.tier}
            </Badge>
            <span className="text-xs text-ink-2">{selectedCustomer.totalOrders} orders on account</span>
          </div>
        )}
      </div>

      {/* ── Order ── */}
      <div>
        <label className={labelClass}>Order</label>
        {fetchingOrders ? (
          <div className="py-2.5 border-b border-border">
            <div className="h-4 w-48 bg-cream-dark animate-pulse rounded" />
          </div>
        ) : (
          <select
            className={cn(inputClass, 'disabled:opacity-40')}
            value={selectedOrder?.id ?? ''}
            onChange={e => setSelectedOrder(orders.find(o => o.id === e.target.value) ?? null)}
            disabled={orders.length === 0}
            required
          >
            <option value="">{orders.length === 0 && selectedCustomer ? 'No orders found' : 'Select order…'}</option>
            {orders.map(o => (
              <option key={o.id} value={o.id}>
                {o.productName} · {formatCurrency(o.amount)} · {formatDate(o.orderDate)}
                {o.isFinalSale ? ' ⚠ FINAL SALE' : ''}
              </option>
            ))}
          </select>
        )}

        {selectedOrder && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-border">
            {[
              { label: 'Product', value: selectedOrder.productName },
              { label: 'Amount', value: formatCurrency(selectedOrder.amount) },
              { label: 'Status', value: selectedOrder.status },
              {
                label: 'Days Since Delivery',
                value: selectedOrder.deliveredDate
                  ? `${daysSince(selectedOrder.deliveredDate)} days`
                  : 'Not delivered',
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="label-uppercase">{label}</p>
                <p className="text-sm font-medium text-ink mt-0.5">{value}</p>
              </div>
            ))}

            {selectedOrder.isFinalSale && (
              <div className="col-span-2 sm:col-span-4 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                ⚠ This is a final sale item. Refund requests will be automatically denied.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Message ── */}
      <div>
        <label className={labelClass}>
          Describe Your Issue
        </label>
        <textarea
          className={cn(inputClass, 'resize-none pt-2')}
          rows={5}
          placeholder="Describe your issue in detail. Be specific about what went wrong — for example: 'The item arrived with a cracked screen and dented packaging.'"
          value={message}
          onChange={e => setMessage(e.target.value)}
          minLength={10}
          maxLength={1000}
          required
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-ink-2">Minimum 10 characters</span>
          <span className="text-[10px] text-ink-2">{message.length} / 1000</span>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <p className="text-sm text-red-600 border-l-2 border-red-500 pl-3">{error}</p>
      )}

      <Button
        type="submit"
        loading={loading}
        disabled={!selectedCustomer || !selectedOrder || message.trim().length < 10}
        size="lg"
        className="w-full"
      >
        {loading ? 'Processing…' : 'Submit Refund Request'}
      </Button>
    </form>
  );
}

// local cn import to avoid circular dependency
function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
