import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PesafiLogoCompact } from "@/components/PesafiLogo";
import {
  ArrowLeft,
  Shield,
  Wallet,
  Globe,
  Banknote,
  Smartphone,
  Building2,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About KermaPay & your account",
  description:
    "What KermaPay is, how your account and wallet work, and how we price South Sudan FX.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <PesafiLogoCompact tone="dark" payAccent="emerald" />
          <div className="w-16" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <section id="about" className="scroll-mt-24">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            About KermaPay
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            KermaPay is a Web3 financial platform for Africa, built on Base. We
            focus on transparent US dollar liquidity and South Sudan SSP pricing
            so businesses and NGOs can convert, hold USDC, and pay across
            borders with rates you can publish and defend.
          </p>
        </section>

        <section id="account" className="scroll-mt-24 mt-14 border-t border-border pt-12">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <Shield className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-semibold">Your account</h2>
          </div>
          <ul className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
            <li className="flex gap-3">
              <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <span>
                When you register, we create a{" "}
                <strong className="text-foreground">smart wallet</strong> for you
                automatically. You do not manage seed phrases in the product
                flow—keys are protected server-side with strong encryption.
              </span>
            </li>
            <li className="flex gap-3">
              <Globe className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
              <span>
                Balances and activity appear in your{" "}
                <Link href="/dashboard" className="font-medium text-emerald-400 hover:underline">
                  dashboard
                </Link>{" "}
                after you sign in. Use{" "}
                <Link href="/dashboard/profile" className="font-medium text-emerald-400 hover:underline">
                  Profile
                </Link>{" "}
                to update your name and preferences.
              </span>
            </li>
            <li className="flex gap-3">
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
              <span>
                Deposits and withdrawals can connect to{" "}
                <strong className="text-foreground">mobile money</strong> and
                card rails where we support them; availability depends on your
                country and verification status.
              </span>
            </li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400">
              <Link href="/register">Create an account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </section>

        <section id="fx-model" className="scroll-mt-24 mt-14 border-t border-border pt-12">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <Banknote className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-semibold">FX model</h2>
          </div>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We publish a benchmark SSP per US dollar for transparency. The same
            figure is shown on our public rate page and at settlement time in
            the app. Spreads reflect liquidity and risk; always confirm the live
            quote before you fund a conversion.
          </p>
          <Button asChild variant="link" className="mt-2 h-auto p-0 text-emerald-400">
            <Link href="/fx">View live FX rate →</Link>
          </Button>
        </section>

        <section id="services" className="scroll-mt-24 mt-14 border-t border-border pt-12">
          <h2 className="text-2xl font-semibold">Services</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            USDC on Base, on- and off-ramps where supported, contact-based
            sends, and tools for treasuries that need a single published rate
            across desks and agents.
          </p>
        </section>

        <section id="solutions" className="scroll-mt-24 mt-14 border-t border-border pt-12">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-orange-400" />
            <h2 className="text-2xl font-semibold">Solutions</h2>
          </div>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            NGOs, importers, and regional businesses use KermaPay to reduce
            informal FX leakage, align internal pricing with a public
            benchmark, and pay suppliers in stable dollars.
          </p>
        </section>

        <section id="features" className="scroll-mt-24 mt-14 border-t border-border pt-12">
          <h2 className="text-2xl font-semibold">Features</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
            <li>Auto-generated wallet on signup</li>
            <li>Dashboard balances and transaction history</li>
            <li>Contacts and quick send</li>
            <li>Published South Sudan FX reference</li>
            <li>Business accounts where enabled</li>
          </ul>
        </section>

        <section id="contact" className="scroll-mt-24 mt-14 border-t border-border pt-12">
          <div className="flex items-center gap-3">
            <Mail className="h-8 w-8 text-emerald-400" />
            <h2 className="text-2xl font-semibold">Contact</h2>
          </div>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Questions about accounts, FX, or partnerships—reach the team directly.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <a href="mailto:hello@kermapay.com?subject=KermaPay%20inquiry">
              hello@kermapay.com
            </a>
          </Button>
        </section>
      </main>
    </div>
  );
}
