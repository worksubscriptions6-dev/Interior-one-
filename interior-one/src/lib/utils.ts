import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** Indian formatting: 1,02,00,000 rather than 10,200,000. */
export const inr = (n: number) =>
  '\u20B9' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n || 0));

export const lakh = (n: number) => {
  const v = n || 0;
  if (Math.abs(v) >= 1e7) return `\u20B9${(v / 1e7).toFixed(2)} Cr`;
  if (Math.abs(v) >= 1e5) return `\u20B9${(v / 1e5).toFixed(1)} L`;
  return inr(v);
};
