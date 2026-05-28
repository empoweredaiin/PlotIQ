import { SQM_TO_SQFT } from '../core/constants';

export const fmt = (n, dp = 0) => {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: dp, minimumFractionDigits: dp });
};

export const fmtSqft = (sqm, dp = 0) => fmt(sqm * SQM_TO_SQFT, dp);

export const fmtCurrency = (n) => {
  const num = Number(n);
  if (Number.isNaN(num) || num === 0) return '—';
  if (num >= 10000000) return `₹ ${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹ ${(num / 100000).toFixed(2)} L`;
  return `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};
