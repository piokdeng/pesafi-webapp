import {
  ArrowRight,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PesafiLogo } from "@/components/PesafiLogo";
import { FooterNewsletterForm } from "@/components/FooterNewsletterForm";

const navigation = [
  {
    title: "Product",
    links: [
      { name: "FX model", href: "/about#fx-model" },
      { name: "Live FX rate", href: "/fx" },
      { name: "Services", href: "/about#services" },
      { name: "Solutions", href: "/about#solutions" },
      { name: "Features", href: "/about#features" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About & account", href: "/about" },
      { name: "Contact", href: "/about#contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "Request demo", href: "mailto:hello@kermapay.com?subject=Demo%20Request" },
      { name: "Contact us", href: "mailto:hello@kermapay.com" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Terms of service", href: "/terms" },
      { name: "Privacy policy", href: "/privacy" },
    ],
  },
];

const socialLinks = [
  { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
  { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
];

const FooterSection = () => {
  return (
    <section className="bg-slate-950/80 border-t border-border rounded-t-3xl py-16 md:py-24 lg:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <footer>
          <div className="mb-16 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-zinc-900/80 to-orange-950/40 border border-emerald-500/20 p-8 md:p-12 lg:p-16 ring-1 ring-white/5">
            <div className="flex flex-col items-center text-center">
              <h2 className="max-w-[800px] text-3xl md:text-4xl lg:text-5xl leading-tight font-semibold tracking-tight text-balance text-foreground">
                Dollar liquidity, transparent pricing
              </h2>
              <p className="mt-4 max-w-[600px] text-base md:text-lg text-muted-foreground">
                KermaPay helps South Sudan businesses and NGOs convert SSP,
                hold USDC, and pay internationally—with rates you can publish and
                defend.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="group bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold border-0 shadow-lg shadow-emerald-500/25"
                >
                  <a
                    href="mailto:hello@kermapay.com?subject=Demo%20Request"
                    className="flex items-center gap-2"
                  >
                    Request a demo
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="border-zinc-800 mb-12 md:mb-14 border-b pb-12 md:pb-14">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center gap-3 mb-3 md:mb-2">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg shadow-md shadow-emerald-500/25 ring-1 ring-white/10">
                      <Mail className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-semibold text-foreground">
                      Stay informed
                    </h3>
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-md">
                    Get weekly financial tips and market insights delivered to
                    you.
                  </p>
                </div>

                <div className="flex-1 max-w-md md:max-w-lg">
                  <FooterNewsletterForm />
                  <p className="text-xs text-muted-foreground mt-3">
                    We respect your privacy. Unsubscribe at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-10 max-w-6xl mx-auto py-10 lg:py-16">
            {navigation.map((section) => (
              <div key={section.title}>
                <h3 className="mb-4 md:mb-5 text-base md:text-lg font-semibold text-foreground">
                  {section.title}
                </h3>
                <ul className="space-y-3 md:space-y-4">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <a
                        href={link.href}
                        className="inline-block text-sm md:text-base text-muted-foreground transition-colors duration-200 hover:text-emerald-400 hover:translate-x-1 transform"
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-zinc-800 border-t mx-auto max-w-6xl mt-4 pt-8">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="flex flex-col items-center md:items-start gap-4">
                <PesafiLogo
                  tone="dark"
                  payAccent="emerald"
                  variant="transparent"
                  className="h-20 w-auto"
                />
                <p className="text-sm md:text-base text-muted-foreground text-center md:text-left">
                  © {new Date().getFullYear()} KermaPay · All rights reserved
                </p>
              </div>
              <div className="flex items-center gap-5 md:gap-6">
                {socialLinks.map((link) => (
                  <a
                    aria-label={link.label}
                    key={link.href}
                    href={link.href}
                    className="text-muted-foreground transition-all duration-200 hover:text-emerald-400 hover:scale-110 transform"
                  >
                    <link.icon size={20} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
};

export { FooterSection };
