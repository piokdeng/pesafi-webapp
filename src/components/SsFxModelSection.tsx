"use client";

import {
  Building2,
  Globe2,
  Network,
  TrendingDown,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const pillars = [
  {
    icon: Globe2,
    title: "Digital FX window",
    body: "A simple in-app exchange with a live, published KermaPay rate—better than the street and without cash risk.",
  },
  {
    icon: Users,
    title: "FX agent network",
    body: "Register trusted street dealers and agents: they earn commissions, tap dollar liquidity, and build a digital track record—similar to how M-Pesa grew its agent model.",
  },
  {
    icon: TrendingDown,
    title: "SSP conversion engine",
    body: "SSP from customers is moved quickly through cross-border rails (e.g. to KES/UGX) and back into dollars for the liquidity pool—capturing spread across the chain.",
  },
  {
    icon: Building2,
    title: "Business FX accounts",
    body: "Importers, NGOs, and operators convert operating SSP to dollars, lock a rate, and pay suppliers from one auditable dashboard.",
  },
  {
    icon: Network,
    title: "Public rate benchmark",
    body: "Publishing the KermaPay rate on the web and in Juba creates transparency and turns every rate check into acquisition.",
  },
];

export function SsFxModelSection() {
  return (
    <section
      id="fx-model"
      className="py-16 md:py-24 bg-zinc-900/30 border-y border-zinc-800/80"
    >
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-400 via-emerald-500 to-orange-500 bg-clip-text text-transparent">
            South Sudan digital FX, built for scale
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            KermaPay is designed to pull informal FX volume onto a transparent
            platform: customers pay SSP via mobile money and receive dollars in
            their wallet—at a clear spread that still beats typical street
            premiums.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((p) => (
            <Card
              key={p.title}
              className="border-zinc-800 bg-card/80 shadow-lg shadow-black/20 hover:border-emerald-500/25 transition-colors"
            >
              <CardContent className="p-6 md:p-7">
                <div className="mb-4 inline-flex rounded-xl bg-emerald-500/15 p-3 text-emerald-400 ring-1 ring-emerald-500/20">
                  <p.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {p.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {p.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 md:mt-16 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-950/40 to-zinc-950/80 px-6 py-8 md:px-10 md:py-10 ring-1 ring-orange-500/10">
          <h3 className="text-xl font-semibold text-foreground mb-3">
            Risk management layer
          </h3>
          <ul className="space-y-2 text-sm md:text-base text-muted-foreground list-disc pl-5 max-w-3xl">
            <li>
              Convert SSP through partner rails quickly—minimize overnight SSP
              exposure.
            </li>
            <li>
              Cap daily FX volume based on how fast treasury can move SSP.
            </li>
            <li>
              Maintain a dollar reserve buffer for peak demand without waiting
              on conversion.
            </li>
            <li>
              Widen the customer spread when SSP volatility rises so pricing
              reflects inventory risk.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
