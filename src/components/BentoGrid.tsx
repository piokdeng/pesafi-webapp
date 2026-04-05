"use client";
import { DollarSign, Clock, Shield, Users, Smartphone, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BentoGrid = () => {
  return (
    <section id="features" className="py-16 md:py-24 bg-zinc-900/25 border-y border-zinc-800/80">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-emerald-400 via-emerald-500 to-orange-500 bg-clip-text text-transparent">
            Why choose KermaPay
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4 text-center">
            Transparent FX pricing, instant settlement, and infrastructure built
            for African markets
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden md:col-span-2 lg:col-span-2 lg:row-span-2 border-emerald-500/25 bg-card/80 shadow-xl shadow-black/30 hover:border-emerald-500/40 transition-all">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/20 to-orange-500/10 rounded-full blur-3xl -z-0" />
            <CardContent className="p-8 md:p-10 h-full flex flex-col justify-between min-h-[320px] md:min-h-[400px] relative z-10">
              <div>
                <div className="inline-flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl shadow-lg shadow-emerald-500/30 ring-1 ring-white/10">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-4 text-foreground">
                  Transparent FX vs the street
                </h3>
                <p className="text-muted-foreground text-sm md:text-base mb-8 leading-relaxed max-w-xl">
                  KermaPay publishes one SSP/USD rate—typically a modest spread
                  above mid—so customers avoid the huge informal premiums and
                  still get convenience and safety. Every quote is visible before
                  you confirm.
                </p>
              </div>
              <div className="space-y-6">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-orange-500 bg-clip-text text-transparent">
                    15–20%
                  </span>
                  <span className="text-base text-muted-foreground">
                    target spread band over mid (illustrative)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <div className="h-1 w-12 bg-red-500/80 rounded" />
                  <span className="text-muted-foreground">
                    vs much larger premiums often seen with cash dealers
                  </span>
                </div>
                <div className="pt-4 border-t border-zinc-800">
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Same flow for businesses under a Business FX account
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-orange-500/25 bg-card/80 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/10 transition-all">
            <CardContent className="p-6 md:p-8 h-full flex flex-col justify-between min-h-[200px]">
              <div>
                <div className="inline-flex p-3 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl shadow-md shadow-orange-500/25 mb-4 ring-1 ring-white/10">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-3 text-foreground">
                  Lightning fast
                </h3>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-6">
                  Money arrives almost instantly, not in days
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-bold text-orange-500">
                  &lt;30
                </span>
                <span className="text-muted-foreground text-sm">seconds</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-emerald-500/20 bg-card/80 hover:border-emerald-500/35 transition-all">
            <CardContent className="p-6 md:p-8 h-full flex flex-col justify-between min-h-[200px]">
              <div>
                <div className="inline-flex p-3 bg-gradient-to-br from-emerald-600 to-teal-800 rounded-xl shadow-md shadow-emerald-500/20 mb-4 ring-1 ring-white/10">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-3 text-foreground">
                  Stable & auditable
                </h3>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                  USDC settlement and clear records—protect value and keep
                  finance teams and donors aligned.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-zinc-700 bg-gradient-to-br from-zinc-900/90 to-zinc-950 border-violet-500/15">
            <CardContent className="p-6 md:p-8 h-full flex flex-col justify-between min-h-[200px]">
              <div>
                <div className="inline-flex p-3 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl shadow-md shadow-violet-500/25 mb-4 ring-1 ring-white/10">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-3 text-foreground">
                  Mobile money ready
                </h3>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                  M-Pesa, MTN, Airtel, and major mobile money networks—same flows
                  as in the app.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden md:col-span-2 border-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-orange-700 text-white shadow-xl shadow-emerald-900/40 hover:shadow-2xl transition-all">
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <CardContent className="p-8 md:p-10 h-full flex flex-col md:flex-row items-center justify-between gap-6 min-h-[240px] relative z-10">
              <div className="flex-1">
                <div className="inline-flex p-3 bg-white/15 rounded-xl shadow-md mb-4 ring-1 ring-white/20">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                  Built for Africa—starting with South Sudan FX
                </h3>
                <p className="text-white/85 text-base md:text-lg leading-relaxed max-w-xl mb-4 text-left">
                  Wallets, agents, and business lines on one stack. No seed
                  phrases; mobile-money-first onboarding where rails exist.
                </p>
                <p className="text-sm text-white/60 italic text-left">
                  East Africa payouts · South Sudan digital FX
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm font-medium text-white">
                    South Sudan
                  </span>
                  <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm font-medium text-white">
                    Kenya
                  </span>
                  <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm font-medium text-white">
                    Uganda
                  </span>
                </div>
              </div>
              <div className="w-full md:w-auto">
                <Button
                  asChild
                  size="lg"
                  className="w-full md:w-auto bg-zinc-950 text-orange-400 hover:bg-zinc-900 border border-zinc-700 shadow-lg hover:shadow-xl transition-all text-base md:text-lg px-8 py-6 font-semibold"
                >
                  <a
                    href="mailto:hello@kermapay.com?subject=Demo%20Request"
                    className="flex items-center gap-2"
                  >
                    <TrendingUp className="h-5 w-5" />
                    Get started today
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export { BentoGrid };
