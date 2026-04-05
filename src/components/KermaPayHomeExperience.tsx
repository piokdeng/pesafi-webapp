"use client";

import Link from "next/link";
import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Menu,
  Search,
  Bell,
  Send,
  ArrowDownLeft,
  Wallet,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  Banknote,
  UserCircle,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import { PesafiLogoCompact } from "@/components/PesafiLogo";
import { BalanceSparkline, RANGES, type SparkRange } from "@/components/landing/BalanceSparkline";
import { cn } from "@/lib/utils";
import { useSupabaseAuth } from "@/lib/supabase-auth-client";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { toast } from "@/components/ui/sonner";

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

function NavDrawerLink({
  href,
  onNavigate,
  children,
  className,
}: {
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent",
        className
      )}
    >
      {children}
    </Link>
  );
}

export default function KermaPayHomeExperience() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollRef = useRef(0);
  const [range, setRange] = useState<SparkRange>("1D");
  const [searchQuery, setSearchQuery] = useState("");

  const closeNav = () => setNavOpen(false);

  const loginWithRedirect = (path: string) =>
    `/login?redirect=${encodeURIComponent(path)}`;

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      toast.message("Search", {
        description: "Type a name, phone, or wallet address to search your contacts.",
      });
      return;
    }
    const path = `/dashboard/contacts?q=${encodeURIComponent(q)}`;
    if (user) {
      router.push(path);
    } else {
      router.push(loginWithRedirect(path));
    }
  };

  const notificationsHref = user
    ? "/dashboard/notifications"
    : loginWithRedirect("/dashboard/notifications");

  const activityHref = user ? "/dashboard" : loginWithRedirect("/dashboard");
  const quickActionHref = user ? "/dashboard" : "/register";
  const depositHref = user ? "/dashboard" : "/register";
  const sendMoneyHref = user ? "/dashboard" : "/login";

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const prev = lastScrollRef.current;
      if (y < 8) setNavHidden(false);
      else if (y > prev && y > 64) setNavHidden(true);
      else if (y < prev) setNavHidden(false);
      lastScrollRef.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <Drawer open={navOpen} onOpenChange={setNavOpen} direction="left" shouldScaleBackground={false}>
        <DrawerContent className="flex !mt-0 h-full max-h-full flex-col rounded-none border-r data-[vaul-drawer-direction=left]:w-[min(100vw,20rem)] data-[vaul-drawer-direction=left]:max-w-none">
          <DrawerHeader className="border-b border-border text-left">
            <DrawerTitle>Menu</DrawerTitle>
          </DrawerHeader>
          <nav className="flex flex-col gap-0.5 p-3" aria-label="Site">
            <NavDrawerLink href="/about" onNavigate={closeNav}>
              About &amp; account
            </NavDrawerLink>
            <NavDrawerLink href="/fx" onNavigate={closeNav}>
              Live FX rate
            </NavDrawerLink>
            <NavDrawerLink href="/about#fx-model" onNavigate={closeNav}>
              FX model
            </NavDrawerLink>
            <NavDrawerLink href="/terms" onNavigate={closeNav}>
              Terms of service
            </NavDrawerLink>
            <NavDrawerLink href="/privacy" onNavigate={closeNav}>
              Privacy policy
            </NavDrawerLink>
            <NavDrawerLink href="/about#contact" onNavigate={closeNav}>
              Contact
            </NavDrawerLink>
            <div className="my-2 border-t border-border" />
            {!authLoading && user ? (
              <>
                <NavDrawerLink href="/dashboard" onNavigate={closeNav}>
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </span>
                </NavDrawerLink>
                <NavDrawerLink href="/dashboard/profile" onNavigate={closeNav}>
                  <span className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Profile
                  </span>
                </NavDrawerLink>
                <NavDrawerLink href="/dashboard/notifications" onNavigate={closeNav}>
                  <span className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </span>
                </NavDrawerLink>
              </>
            ) : (
              <>
                <NavDrawerLink href="/login" onNavigate={closeNav}>
                  Log in
                </NavDrawerLink>
                <NavDrawerLink href="/register" onNavigate={closeNav}>
                  Create account
                </NavDrawerLink>
              </>
            )}
          </nav>
          <div className="mt-auto border-t border-border p-3">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Close
              </Button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>

      <header>
        <nav
          className={cn(
            "fixed top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-md transition-transform duration-300",
            navHidden ? "-translate-y-full" : "translate-y-0"
          )}
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-foreground"
                aria-label="Open menu"
                aria-expanded={navOpen}
                onClick={() => setNavOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
              <Link href="/" className="shrink-0" onClick={closeNav}>
                <PesafiLogoCompact tone="dark" payAccent="emerald" />
              </Link>
              <form
                onSubmit={onSearchSubmit}
                className="hidden min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 md:flex lg:max-w-xl"
                role="search"
              >
                <label htmlFor="home-search" className="sr-only">
                  Search contacts and wallets
                </label>
                <Search className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                <Input
                  id="home-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts, phone, address…"
                  className="h-8 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                />
                <Button type="submit" size="sm" variant="secondary" className="h-7 shrink-0 px-2 text-xs">
                  Go
                </Button>
              </form>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link href={notificationsHref} aria-label="Notifications">
                  <span className="relative inline-flex">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-background">
                      3
                    </span>
                  </span>
                </Link>
              </Button>
              {!authLoading && user ? (
                <Button variant="outline" size="sm" className="shrink-0 sm:hidden" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : null}
              <div className="hidden items-center gap-2 sm:flex">
                {!authLoading && user ? (
                  <>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="border-border">
                      <Link href="/dashboard/profile">Account</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/login">Log in</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="border-border">
                      <Link href="/fx">Live FX rate</Link>
                    </Button>
                    <Button
                      size="sm"
                      asChild
                      className="bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400"
                    >
                      <Link href="/register">Create account</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            <form
              onSubmit={onSearchSubmit}
              className="flex w-full items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 md:hidden"
              role="search"
            >
              <label htmlFor="home-search-mobile" className="sr-only">
                Search contacts and wallets
              </label>
              <Search className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              <Input
                id="home-search-mobile"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="h-9 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
              <Button type="submit" size="sm" variant="secondary" className="h-8 shrink-0 px-3 text-xs">
                Go
              </Button>
            </form>
          </div>
        </nav>
      </header>

      <main className="min-h-screen bg-background pb-16 pt-[4.25rem] md:pt-[4.25rem]">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(56,189,248,0.08),transparent_50%)]"
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
        </div>
      </main>
    </>
  );
}
