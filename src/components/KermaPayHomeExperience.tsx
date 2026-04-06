"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Send,
  ArrowDownLeft,
  Wallet,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  Banknote,
  FileText,
} from "lucide-react";
import { BalanceSparkline, RANGES, type SparkRange } from "@/components/landing/BalanceSparkline";
import { cn } from "@/lib/utils";
import { useSupabaseAuth } from "@/lib/supabase-auth-client";
import { PublicPageShell } from "@/components/PublicPageShell";

const activities = [
  {
    title: "Received USDC",
    sub: "from Sarah M.",
    amount: "+$320.00",
    time: "2h ago",
    positive: true,
    flag: "🟢",
  },
  {
    title: "Sent to M-Pesa Kenya",
    sub: "Mary Auma",
    amount: "-$160.00",
    time: "5h ago",
    positive: false,
    flag: "🇰🇪",
  },
  {
    title: "Earn yield deposit",
    sub: "USDC Savings",
    amount: "+$2.14",
    time: "1d ago",
    positive: true,
    flag: "📈",
  },
  {
    title: "Sent to MTN MoMo Uganda",
    sub: "David Okello",
    amount: "-$42.50",
    time: "2d ago",
    positive: false,
    flag: "🇺🇬",
  },
];

export default function KermaPayHomeExperience() {
  const { user } = useSupabaseAuth();
  const [range, setRange] = useState<SparkRange>("1D");

  const loginWithRedirect = (path: string) =>
    `/login?redirect=${encodeURIComponent(path)}`;

  const activityHref = user ? "/dashboard" : loginWithRedirect("/dashboard");
  const quickActionHref = user ? "/dashboard" : "/register";
  const depositHref = user ? "/dashboard" : "/register";
  const sendMoneyHref = user ? "/dashboard" : "/login";

  return (
    <PublicPageShell>
      <div className="grid gap-8 pb-6 pt-6 lg:grid-cols-12 lg:gap-10 lg:pt-10">
        <div className="space-y-6 lg:col-span-7">
          <section className="rounded-2xl border border-border/80 bg-card/85 p-5 shadow-xl shadow-sky-950/15 ring-1 ring-sky-500/10 backdrop-blur-sm sm:p-8">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-left">
              Total balance
            </p>
            <p className="mt-1 text-center text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-left sm:text-5xl">
              $4,820.03
            </p>
            <div className="mt-2 flex justify-center sm:justify-start">
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/25">
                +$12.40 (0.26%)
              </span>
            </div>

            <div className="mt-6">
              <BalanceSparkline range={range} />
              <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      range === r
                        ? "bg-emerald-500 text-slate-950"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <Link
            href="/fx"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-gradient-to-r from-sky-950/40 via-card/90 to-card/90 p-5 shadow-lg ring-1 ring-sky-500/15 transition hover:border-sky-500/30 hover:ring-sky-500/25 sm:p-6"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25">
                <Banknote className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Live South Sudan FX
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Published SSP per US dollar — full benchmark and context on a
                  dedicated page.
                </p>
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-400 group-hover:text-emerald-300">
              View rate
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>

          <section>
            <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground">
              Quick actions
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <Link
                href={quickActionHref}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/50 py-4 text-center transition hover:bg-muted/40"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/30">
                  <Send className="h-6 w-6 -rotate-45" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">Send</span>
              </Link>
              <Link
                href={quickActionHref}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/50 py-4 text-center transition hover:bg-muted/40"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/40 text-emerald-400 ring-1 ring-emerald-500/15">
                  <ArrowDownLeft className="h-6 w-6" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  Receive
                </span>
              </Link>
              <Link
                href={quickActionHref}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/50 py-4 text-center transition hover:bg-muted/40"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/40 text-orange-400 ring-1 ring-orange-500/20">
                  <Wallet className="h-6 w-6" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">Pay</span>
              </Link>
              <Link
                href={quickActionHref}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/50 py-4 text-center transition hover:bg-muted/40"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/40 text-orange-400 ring-1 ring-orange-500/20">
                  <TrendingUp className="h-6 w-6" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">Invest</span>
              </Link>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <Button
              asChild
              className="h-12 rounded-xl bg-emerald-500 text-base font-semibold text-slate-950 hover:bg-emerald-400"
            >
              <Link href={depositHref}>Deposit</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-xl border-orange-500/40 bg-card text-base font-semibold text-orange-400 hover:bg-muted/50 hover:text-orange-300"
            >
              <Link href={sendMoneyHref}>Send money</Link>
            </Button>
          </div>
        </div>

        <div className="lg:col-span-5">
          <section className="rounded-2xl border border-border/80 bg-card/85 p-5 shadow-lg ring-1 ring-sky-500/10 backdrop-blur-sm sm:p-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-wide text-foreground">
                Recent activity
              </h2>
              <Link
                href={activityHref}
                className="flex items-center gap-0.5 text-xs font-medium text-emerald-400 hover:text-emerald-300"
              >
                See all
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <ul className="space-y-3">
              {activities.map((a, i) => (
                <li key={i}>
                  <Link
                    href={activityHref}
                    className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/40 px-3 py-2.5 transition hover:bg-muted/30"
                  >
                    <span className="text-lg leading-none" aria-hidden>
                      {a.flag}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight text-foreground">
                        {a.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.sub}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{a.time}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          a.positive ? "text-emerald-400" : "text-foreground"
                        )}
                      >
                        {a.amount}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
              <Button variant="outline" size="sm" className="text-xs" asChild>
                <Link href={activityHref}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Full activity
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" asChild>
                <Link href="/about">About account</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>

      <p className="mt-10 border-t border-border/60 pt-8 text-center text-xs text-muted-foreground">
        Demo home experience ·{" "}
        <Link href="/register" className="font-medium text-emerald-400 hover:underline">
          Open a real wallet
        </Link>{" "}
        for USDC on Base and mobile-money rails.
      </p>
    </PublicPageShell>
  );
}
