"use client";
import { Smartphone, Zap, Users, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Smartphone,
    step: "Step 1",
    title: "Sign up",
    description:
      "Create your KermaPay account in minutes—no seed phrases, no paperwork wall for basic access.",
  },
  {
    icon: Zap,
    step: "Step 2",
    title: "Fund with SSP or other rails",
    description:
      "For South Sudan users: pay in SSP via mobile money for FX. Elsewhere: load via mobile money, card, or partners—your USDC wallet is ready fast.",
  },
  {
    icon: Users,
    step: "Step 3",
    title: "Convert, send, and pay",
    description:
      "Lock the published rate, receive dollars in-app, then send to suppliers, staff, or on-chain addresses with clear fees.",
  },
  {
    icon: TrendingUp,
    step: "Step 4",
    title: "Operate globally",
    description:
      "Businesses and NGOs keep an auditable trail—ideal for cross-border invoices, grants, and operating budgets.",
  },
];

const SolutionsSection = () => {
  return (
    <section id="solutions" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-emerald-400 via-emerald-500 to-orange-500 bg-clip-text text-transparent">
            How it works
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4 text-center">
            Getting started with KermaPay is simple and takes just minutes
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 p-4 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full shadow-lg shadow-emerald-500/25 ring-1 ring-white/10">
                  <step.icon className="h-7 w-7 md:h-8 md:w-8 text-white" />
                </div>
                <span className="text-xs md:text-sm font-semibold text-emerald-500 mb-2">
                  {step.step}
                </span>
                <h3 className="text-lg md:text-xl font-bold mb-3 text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-emerald-500/40 to-transparent -translate-x-1/2" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { SolutionsSection };
