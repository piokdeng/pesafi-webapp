"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Search, Bell, UserCircle, LayoutDashboard } from "lucide-react";
import { PesafiLogoCompact } from "@/components/PesafiLogo";
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

export function PublicPageShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollRef = useRef(0);
  const [searchQuery, setSearchQuery] = useState("");

  const closeNav = () => setNavOpen(false);

  const loginWithRedirect = (path: string) =>
    `/login?redirect=${encodeURIComponent(path)}`;

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      toast.message("Search", {
        description:
          "Type a name, phone, or wallet address to search your contacts.",
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

  const isLogin = pathname === "/login";
  const isRegister = pathname === "/register";

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
      <Drawer
        open={navOpen}
        onOpenChange={setNavOpen}
        direction="left"
        shouldScaleBackground={false}
      >
        <DrawerContent className="flex !mt-0 h-full max-h-full flex-col rounded-none border-r data-[vaul-drawer-direction=left]:w-[min(100vw,20rem)] data-[vaul-drawer-direction=left]:max-w-none">
          <DrawerHeader className="border-b border-border text-left">
            <DrawerTitle>Menu</DrawerTitle>
          </DrawerHeader>
          <nav className="flex flex-col gap-0.5 p-3" aria-label="Site">
            <NavDrawerLink href="/" onNavigate={closeNav}>
              Home
            </NavDrawerLink>
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
                <NavDrawerLink
                  href="/dashboard/notifications"
                  onNavigate={closeNav}
                >
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
                <label htmlFor="shell-search" className="sr-only">
                  Search contacts and wallets
                </label>
                <Search className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                <Input
                  id="shell-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts, phone, address…"
                  className="h-8 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  className="h-7 shrink-0 px-2 text-xs"
                >
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
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 sm:hidden"
                  asChild
                >
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : null}
              <div className="hidden items-center gap-2 sm:flex">
                {!authLoading && user ? (
                  <>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="border-border"
                    >
                      <Link href="/dashboard/profile">Account</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className={cn(
                        isLogin &&
                          "pointer-events-none bg-muted/50 text-emerald-400 ring-1 ring-emerald-500/30"
                      )}
                    >
                      <Link href="/login" aria-current={isLogin ? "page" : undefined}>
                        Log in
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="border-border">
                      <Link href="/fx">Live FX rate</Link>
                    </Button>
                    <Button
                      size="sm"
                      asChild
                      className={cn(
                        "font-semibold text-slate-950 hover:bg-emerald-400",
                        isRegister
                          ? "bg-emerald-400 ring-2 ring-emerald-300/50"
                          : "bg-emerald-500"
                      )}
                    >
                      <Link
                        href="/register"
                        aria-current={isRegister ? "page" : undefined}
                      >
                        Create account
                      </Link>
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
              <label htmlFor="shell-search-mobile" className="sr-only">
                Search contacts and wallets
              </label>
              <Search className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              <Input
                id="shell-search-mobile"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="h-9 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                className="h-8 shrink-0 px-3 text-xs"
              >
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
          {children}
        </div>
      </main>
    </>
  );
}
