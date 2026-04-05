"use client";

import React from "react";

import { cn } from "@/lib/utils";

import { Marquee } from "@/components/magicui/marquee";

const IntegrationSection = () => {
  const logos = [
    {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/slack-icon.svg",
      name: "WhatsApp",
      className: "invert",
    },
    {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/notion-icon.svg",
      name: "Telegram",
      className: "invert",
    },
    {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/github-icon.svg",
      name: "SMS",
      className: "invert",
    },
    {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/google-icon.svg",
      name: "Email",
      className: "invert",
    },
    {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/nike-icon.svg",
      name: "Mobile",
      className: "invert",
    },
    {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/sketch-icon.svg",
      name: "Web App",
      className: "invert",
    },
    {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/figma-icon.svg",
      name: "USSD",
      className: "invert",
    },
  ];

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/10 blur-3xl rounded-full opacity-30"></div>

      <div className="container mx-auto relative z-10">
        {/* Header Section */}
        <div className="text-center flex flex-col max-w-4xl mx-auto mb-20">
          <div className="inline-flex w-fit mx-auto items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            Multi-Channel Access
          </div>

          <h2 className="text-4xl md:text-6xl lg:text-7xl tracking-tight mb-6">
            <span className="bg-gradient-to-br from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              Reach customers on
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              every platform
            </span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground/80 leading-relaxed max-w-2xl mx-auto">
            From WhatsApp to USSD, KermaPay works across all channels.
            <br className="hidden md:block" />
            One powerful platform for all your payment needs.
          </p>
        </div>

        {/* Enhanced Marquee Section */}
        <div className="relative py-2">
          {/* Top gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background  z-10 pointer-events-none"></div>

          {/* First row */}
          <div className="mb-6">
            <Marquee pauseOnHover className="[--duration:25s]">
              {logos.map((logo, index) => (
                <div
                  key={`row1-${index}`}
                  className="group mx-4 flex items-center justify-center gap-3 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 px-6 py-4 hover:bg-card/80 hover:border-primary/30 transition-all duration-300 hover:scale-105"
                >
                  <div className="relative">
                    <img
                      src={logo.image}
                      alt={logo.name}
                      className={cn(
                        "size-6 transition-all duration-300 group-hover:scale-110",
                        logo?.className
                      )}
                    />
                    <div className="absolute inset-0 bg-primary/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"></div>
                  </div>
                  <p className="text-base font-medium text-foreground/90 group-hover:text-foreground transition-colors duration-300">
                    {logo.name}
                  </p>
                </div>
              ))}
            </Marquee>
          </div>

          {/* Second row (reverse) */}
          <div className="mb-6">
            <Marquee pauseOnHover reverse className="[--duration:30s]">
              {[...logos].reverse().map((logo, index) => (
                <div
                  key={`row2-${index}`}
                  className="group mx-4 flex items-center justify-center gap-3 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 px-6 py-4 hover:bg-card/80 hover:border-primary/30 transition-all duration-300 hover:scale-105"
                >
                  <div className="relative">
                    <img
                      src={logo.image}
                      alt={logo.name}
                      className={cn(
                        "size-6 transition-all duration-300 group-hover:scale-110",
                        logo?.className
                      )}
                    />
                    <div className="absolute inset-0 bg-primary/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"></div>
                  </div>
                  <p className="text-base font-medium text-foreground/90 group-hover:text-foreground transition-colors duration-300">
                    {logo.name}
                  </p>
                </div>
              ))}
            </Marquee>
          </div>

          {/* Third row */}
          <div className="mb-6">
            <Marquee pauseOnHover className="[--duration:35s]">
              {logos
                .slice(0, 4)
                .concat(logos.slice(0, 3))
                .map((logo, index) => (
                  <div
                    key={`row3-${index}`}
                    className="group mx-4 flex items-center justify-center gap-3 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 px-6 py-4 hover:bg-card/80 hover:border-primary/30 transition-all duration-300 hover:scale-105"
                  >
                    <div className="relative">
                      <img
                        src={logo.image}
                        alt={logo.name}
                        className={cn(
                          "size-6 transition-all duration-300 group-hover:scale-110",
                          logo?.className
                        )}
                      />
                      <div className="absolute inset-0 bg-primary/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"></div>
                    </div>
                    <p className="text-base font-medium text-foreground/90 group-hover:text-foreground transition-colors duration-300">
                      {logo.name}
                    </p>
                  </div>
                ))}
            </Marquee>
          </div>

          {/* Bottom gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background z-10 pointer-events-none"></div>
        </div>

        <div className="text-center mt-20">
          <div className="inline-flex items-center gap-6 px-10 py-6 rounded-3xl bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 backdrop-blur-2xl border border-primary/30 shadow-2xl shadow-primary/10 hover:shadow-primary/20 transition-all duration-500 ">
            <span className="text-base font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Join 5,000+ businesses already using KermaPay
            </span>
            <div className="flex -space-x-3">
              {["Amara", "Kofi", "Fatima", "Chidi"].map((seed, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-3 border-background shadow-xl shadow-primary/30 hover:scale-110 transition-transform duration-300 overflow-hidden"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <img
                    src={`https://api.dicebear.com/9.x/notionists/svg?seed=${seed}`}
                    alt={`User ${seed}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-muted/80 to-muted border-3 border-background flex items-center justify-center shadow-xl shadow-muted/30 hover:scale-110 transition-transform duration-300">
                <span className="text-sm font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  +
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { IntegrationSection };