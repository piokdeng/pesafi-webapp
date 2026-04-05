"use client";
import { Lightbulb, Target, Users, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const values = [
  {
    icon: Target,
    title: "Financial inclusion",
    description:
      "Making financial services accessible to everyone, regardless of banking status",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description:
      "Leveraging blockchain technology to solve real problems in East Africa",
  },
  {
    icon: Users,
    title: "Community first",
    description:
      "Building a platform that serves and empowers local communities",
  },
  {
    icon: Globe,
    title: "Transparency",
    description:
      "Clear pricing, secure transactions, and honest communication always",
  },
];

const AboutSection = () => {
  return (
    <section id="about" className="py-16 md:py-24 bg-zinc-900/30 border-y border-zinc-800/80">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-emerald-400 via-emerald-500 to-orange-500 bg-clip-text text-transparent">
            About KermaPay
          </h2>
        </div>

        <div className="max-w-4xl mx-auto mb-12 md:mb-16 space-y-6">
          <p className="text-base md:text-lg text-muted-foreground text-center leading-relaxed px-4">
            <span className="text-emerald-400 font-semibold">Kerma</span>
            <span className="text-foreground font-semibold">Pay</span>{" "}
            is a financial platform built for African markets: USDC wallets,
            mobile-money rails, and—starting in South Sudan—a published digital
            FX window so people and businesses access dollars without opaque
            street economics.
          </p>
          <p className="text-base md:text-lg text-muted-foreground text-center leading-relaxed px-4">
            We combine blockchain settlement with pragmatic compliance: agents
            can formalize their flow, treasuries can manage SSP exposure with
            discipline, and customers get one honest rate they can share with
            their teams and donors.
          </p>
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/50 to-zinc-950/80 p-6 md:p-8 mx-4 md:mx-0 ring-1 ring-emerald-500/10">
            <h3 className="text-xl md:text-2xl font-bold text-center mb-4 text-foreground">
              Our mission
            </h3>
            <p className="text-base md:text-lg text-center text-muted-foreground leading-relaxed">
              Make cross-border money work for everyday Africans—fair pricing,
              fast settlement, and products shaped for importers, households, and
              institutions alike.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-xl md:text-2xl font-bold text-center mb-8 md:mb-12 text-foreground">
            Our values
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {values.map((value, index) => (
              <Card
                key={index}
                className="border-zinc-800 bg-card/60 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/5 group"
              >
                <CardContent className="pt-6 text-center px-4">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-orange-600 rounded-full shadow-md shadow-emerald-500/20 group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-shadow ring-1 ring-white/10">
                      <value.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h4 className="font-bold mb-2 text-base text-foreground">
                    {value.title}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export { AboutSection };
