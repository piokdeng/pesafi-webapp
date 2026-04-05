import { cn } from '@/lib/utils';

export interface KermaPayLogoProps {
  variant?: 'transparent';
  className?: string;
  width?: number;
  height?: number;
  /** Use `dark` on deep backgrounds (e.g. hero). */
  tone?: 'light' | 'dark';
  /** Match app UI accents (emerald) vs brand gold (amber). */
  payAccent?: 'amber' | 'emerald';
}

export function KermaPayLogo({
  className,
  variant: _variant,
  width: _w,
  height: _h,
  tone = 'light',
  payAccent = 'amber',
}: KermaPayLogoProps) {
  const kerma =
    tone === 'dark' ? 'text-white' : 'text-slate-900 dark:text-white';
  const payDark = payAccent === 'emerald' ? 'text-emerald-400' : 'text-amber-400';
  const payLight =
    payAccent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-500';
  const pay = tone === 'dark' ? payDark : payLight;
  return (
    <span
      className={cn(
        'inline-flex items-baseline font-extrabold tracking-tight select-none text-3xl md:text-4xl',
        className
      )}
      aria-label="KermaPay"
    >
      <span className={kerma}>Kerma</span>
      <span className={pay}>Pay</span>
    </span>
  );
}

export function KermaPayLogoCompact({
  className,
  variant: _variant,
  tone = 'light',
  payAccent = 'amber',
}: Pick<KermaPayLogoProps, 'variant' | 'className' | 'tone' | 'payAccent'>) {
  const kerma =
    tone === 'dark' ? 'text-white' : 'text-slate-900 dark:text-white';
  const payDark = payAccent === 'emerald' ? 'text-emerald-400' : 'text-amber-400';
  const payLight =
    payAccent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-500';
  const pay = tone === 'dark' ? payDark : payLight;
  return (
    <span
      className={cn(
        'inline-flex items-baseline font-extrabold tracking-tight select-none text-xl sm:text-2xl',
        className
      )}
      aria-label="KermaPay"
    >
      <span className={kerma}>Kerma</span>
      <span className={pay}>Pay</span>
    </span>
  );
}
