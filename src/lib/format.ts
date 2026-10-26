import { CURRENCY_SYMBOLS } from '@shared/tax-math';
import { SupportedCurrency } from '@shared/types';

/**
 * Formats BDT in authentic South Asian / Bangladeshi grouping (1,24,500)
 */
export function formatBdt(amount: number, decimals = 0): string {
  if (!Number.isFinite(amount)) return '৳0';
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return `৳${formatted}`;
}

export function formatForeign(amount: number, currency: SupportedCurrency, decimals = 2): string {
  if (currency === 'BDT') return formatBdt(amount, decimals);
  const symbol = CURRENCY_SYMBOLS[currency] || '';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return `${symbol}${formatted}`;
}

export function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return '0.00%';
  return `${pct.toFixed(2)}%`;
}
