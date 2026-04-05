'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

export type FxRatePayload = {
  market: string;
  midMarketSspPerUsd: number;
  kermapaySspPerUsd: number;
  spreadOverMidPercent: number;
  updatedAt: string;
  disclaimer: string;
};

type Props = {
  className?: string;
  compact?: boolean;
  /** `dark` for slate hero backgrounds; `light` for dashboard/cards. */
  surface?: 'dark' | 'light';
};

export function FxRateDisplay({ className, compact, surface = 'dark' }: Props) {
  const [data, setData] = useState<FxRatePayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setErr(null);
    fetch('/api/fx/rate')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load rate');
        return r.json();
      })
      .then(setData)
      .catch(() => setErr('Could not load live rate'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const isLight = surface === 'light';

  if (loading && !data) {
    return (
      <div
        className={cn(
          'rounded-2xl border px-6 py-4',
          isLight
            ? 'border-border bg-muted/50 text-muted-foreground'
            : 'border-white/10 bg-white/5 text-white/70',
          className
        )}
      >
        <RefreshCw className="h-5 w-5 animate-spin inline mr-2" />
        Loading KermaPay rate…
      </div>
    );
  }

  if (err || !data) {
    return (
      <div
        className={cn(
          'rounded-2xl border px-6 py-4 text-sm',
          isLight
            ? 'border-destructive/30 bg-destructive/10 text-destructive'
            : 'border-red-500/30 bg-red-950/40 text-red-200',
          className
        )}
      >
        {err}
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={cn(
          'rounded-xl border px-4 py-3 text-sm',
          isLight
            ? 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 text-foreground'
            : 'border-amber-500/30 bg-slate-900/80 text-white',
          className
        )}
      >
        <span className={isLight ? 'text-muted-foreground' : 'text-white/60'}>
          KermaPay rate ·{' '}
        </span>
        <span className="font-semibold tabular-nums">
          {data.kermapaySspPerUsd.toLocaleString()} SSP
        </span>
        <span className={isLight ? 'text-muted-foreground' : 'text-white/60'}>
          {' '}
          / 1 USD
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl border p-6 md:p-8 shadow-lg',
        isLight
          ? 'border-border bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/40 dark:to-orange-950/20 text-foreground shadow-amber-500/10'
          : 'border-amber-500/25 bg-gradient-to-br from-slate-900/90 to-slate-950/95 text-white shadow-amber-900/20',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p
            className={cn(
              'text-xs font-medium uppercase tracking-wider',
              isLight ? 'text-amber-700 dark:text-amber-400' : 'text-amber-400/90'
            )}
          >
            Published KermaPay FX rate
          </p>
          <p className="mt-2 text-3xl md:text-4xl font-bold tabular-nums tracking-tight">
            {data.kermapaySspPerUsd.toLocaleString()}{' '}
            <span
              className={cn(
                'text-lg md:text-xl font-semibold',
                isLight ? 'text-muted-foreground' : 'text-white/80'
              )}
            >
              SSP / USD
            </span>
          </p>
          <p
            className={cn(
              'mt-2 text-sm',
              isLight ? 'text-muted-foreground' : 'text-white/55'
            )}
          >
            Mid reference ~{data.midMarketSspPerUsd.toLocaleString()} SSP ·
            transparent spread ~{data.spreadOverMidPercent}% above mid
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className={cn(
            'rounded-lg border p-2',
            isLight
              ? 'border-border bg-background hover:bg-muted text-foreground'
              : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
          )}
          aria-label="Refresh rate"
        >
          <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
        </button>
      </div>
      <p
        className={cn(
          'mt-4 text-xs leading-relaxed',
          isLight ? 'text-muted-foreground' : 'text-white/45'
        )}
      >
        {data.disclaimer}
      </p>
    </div>
  );
}
