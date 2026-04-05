import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PesafiLogoCompact } from "@/components/PesafiLogo";
import { FxRateDisplay } from "@/components/FxRateDisplay";

export const metadata: Metadata = {
  title: "Live SSP/USD rate | KermaPay",
  description:
    "Published KermaPay FX rate for South Sudan. Transparent SSP per US dollar benchmark.",
};

export default function PublicFxPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-zinc-800 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center">
            <PesafiLogoCompact tone="dark" payAccent="emerald" />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/about">About &amp; account</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold border-0"
            >
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p className="text-sm font-medium uppercase tracking-wider text-emerald-500">
          Public benchmark
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          KermaPay South Sudan FX rate
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          We publish this rate as a reference for customers, agents, and
          businesses—so everyone shares the same transparent benchmark before
          they convert or send.
        </p>

        <div className="mt-10">
          <FxRateDisplay />
        </div>

        <div className="mt-12 rounded-2xl border border-zinc-800 bg-card/50 p-6 text-sm text-muted-foreground leading-relaxed">
          <p>
            This page is the marketing and transparency surface described in
            the KermaPay FX model: the same figure appears in-app at settlement
            time. Rates move with liquidity and volatility; always confirm in
            the app before you fund a conversion.
          </p>
          <p className="mt-4">
            <Link
              href="/dashboard/fx"
              className="font-medium text-emerald-400 hover:text-emerald-300"
            >
              Signed in? Open the FX calculator in your wallet →
            </Link>
          </p>
          <p className="mt-4">
            <Link
              href="/"
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
