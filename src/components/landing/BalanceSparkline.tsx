"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

const RANGES = ["1H", "1D", "1W", "1M", "1Y", "All"] as const;
export type SparkRange = (typeof RANGES)[number];

function seriesFor(range: SparkRange): number[] {
  const base = 4820;
  const jitter = (i: number, spread: number) =>
    base + Math.sin(i * 0.35) * spread + (i % 3) * (spread / 8);

  switch (range) {
    case "1H":
      return Array.from({ length: 24 }, (_, i) => jitter(i, 18));
    case "1D":
      return Array.from({ length: 32 }, (_, i) => jitter(i, 45));
    case "1W":
      return Array.from({ length: 28 }, (_, i) => jitter(i, 80));
    case "1M":
      return Array.from({ length: 30 }, (_, i) => jitter(i, 140));
    case "1Y":
      return Array.from({ length: 36 }, (_, i) => jitter(i, 320));
    case "All":
    default:
      return Array.from({ length: 40 }, (_, i) => jitter(i, 400));
  }
}

type Props = {
  range: SparkRange;
  className?: string;
};

export function BalanceSparkline({ range, className }: Props) {
  const data = useMemo(() => seriesFor(range), [range]);
  const w = 320;
  const h = 72;
  const pad = 4;

  const { lineD, areaD, lastY } = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const pts = data.map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (v - min) / span) * (h - pad * 2);
      return { x, y };
    });
    const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `M ${pts[0].x},${h - pad} L ${pts.map((p) => `${p.x},${p.y}`).join(" L ")} L ${pts[pts.length - 1].x},${h - pad} Z`;
    return { lineD: line, areaD: area, lastY: pts[pts.length - 1].y };
  }, [data, w, h, pad]);

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-[4.5rem] overflow-visible"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sparkLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(52, 211, 153)" />
            <stop offset="100%" stopColor="rgb(16, 185, 129)" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={areaD} fill="url(#sparkFill)" />
        <polyline
          fill="none"
          stroke="url(#sparkLine)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={lineD}
          filter="url(#glow)"
        />
        <circle
          cx={w - pad}
          cy={lastY}
          r="3.5"
          className="fill-emerald-400"
          stroke="rgb(15 23 42 / 0.9)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

export { RANGES };
