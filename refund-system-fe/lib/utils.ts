import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Decision, Tier } from './api';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function decisionColor(decision: Decision): string {
  switch (decision) {
    case 'APPROVED':  return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'DENIED':    return 'bg-red-50 text-red-800 border-red-200';
    case 'ESCALATED': return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'PENDING':   return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

export function decisionBorder(decision: Decision): string {
  switch (decision) {
    case 'APPROVED':  return 'border-l-emerald-500';
    case 'DENIED':    return 'border-l-red-500';
    case 'ESCALATED': return 'border-l-amber-500';
    case 'PENDING':   return 'border-l-gray-400';
  }
}

export function decisionIcon(decision: Decision): string {
  switch (decision) {
    case 'APPROVED':  return '✓';
    case 'DENIED':    return '✕';
    case 'ESCALATED': return '△';
    case 'PENDING':   return '○';
  }
}

export function tierBadgeClass(tier: Tier): string {
  switch (tier) {
    case 'VIP':      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'PREMIUM':  return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'STANDARD': return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

export function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}
