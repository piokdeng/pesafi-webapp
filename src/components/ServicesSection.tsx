"use client";
import { Wallet, Globe, ShoppingCart, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const services = [
  {
    icon: Wallet,
    title: "South Sudan FX & USDC wallet",
    description:
      "Convert SSP to dollars in-app at a published KermaPay rate. Pay in via mobile money, receive USDC in your wallet—no street cash, no opaque dealer quotes.",
    features: [
      "Live published SSP/USD rate in the app and on the web",
      "Designed for importers, households, and NGOs",
      "Mobile money in, digital dollars out",
      "Agent and business workflows supported",
    ],
  },
  {
    icon: Globe,
    title: "Cross-border payments & liquidity",
    description:
      "Send and receive across East Africa and globally on stable rails. Treasury moves SSP through partner corridors to keep dollar liquidity healthy.",
    features: [
      "Near-instant cross-border transfers",
      "Up to 90% lower fees than traditional services",
      "Transparent exchange rates",
      "Track transfers in real-time",
    ],
  },
  {
    icon: ShoppingCart,
    title: "Merchant payment solutions",
    description: "Accept payments easily whether you're selling online or in-person. Simple mobile POS for small businesses and e-commerce integration.",
    features: [
      "QR code payments for in-person sales",
      "E-commerce payment gateway",
      "Instant settlement to your wallet",
      "Accept multiple currencies",
    ],
  },
  {
    icon: Shield,
    title: "Secure & transparent",
    description: "Built on blockchain technology for maximum security. All transactions are encrypted and recorded for complete transparency.",
    features: [
      "Bank-grade security encryption",
      "Blockchain-verified transactions",
      "Fraud protection built-in",
      "Your money, your control",
    ],
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-emerald-400 via-emerald-500 to-orange-500 bg-clip-text text-transparent">
            What we offer
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4 text-center">
            KermaPay combines digital FX for South Sudan with wallets and
            payouts across Africa—transparent pricing first.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {services.map((service, index) => (
            <Card
              key={index}
              className="border-zinc-800 bg-card/60 hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/5 group"
            >
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-2">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl w-fit shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/35 transition-shadow ring-1 ring-white/10">
                    <service.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg sm:text-xl text-foreground">
                    {service.title}
                  </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2.5 md:space-y-3">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-0.5 text-emerald-500 flex-shrink-0">
                        ✓
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export { ServicesSection };
