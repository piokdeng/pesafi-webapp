'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseAuth, supabaseAuthClient } from "@/lib/supabase-auth-client";
import {
  LayoutDashboard,
  Receipt,
  Users,
  Settings,
  BarChart3,
  Wallet,
  LogOut,
  BookUser,
  Menu,
  X,
  Building2,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PesafiLogo } from "@/components/PesafiLogo";
import { Loader2 } from "lucide-react";
const navigation = [
  { name: "Dashboard", href: "/business/dashboard", icon: LayoutDashboard },
  { name: "Wallet", href: "/business/wallet", icon: Wallet },
  { name: "Transactions", href: "/business/transactions", icon: Receipt },
  { name: "Team", href: "/business/team", icon: Users },
  { name: "Contacts", href: "/business/contacts", icon: BookUser },
  { name: "Analytics", href: "/business/analytics", icon: BarChart3 },
  { name: "Settings", href: "/business/settings", icon: Settings },
];

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, signOut, loading: authLoading } = useSupabaseAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBusinessAccess = async () => {
      if (authLoading) return;

      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch business profile
      try {
        const { data: profile, error } = await supabaseAuthClient
          .from('business_profile')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error || !profile) {
          console.error('No business profile found');
          router.push('/dashboard'); // Redirect to individual dashboard
          return;
        }

        setBusinessProfile(profile);
      } catch (error) {
        console.error('Error fetching business profile:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkBusinessAccess();
  }, [user, authLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-card border-r transform transition-all duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo and Toggle */}
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-4 py-4 border-b`}>
            {!sidebarCollapsed && (
              <Link href="/business/dashboard" className="flex-shrink-0">
                <PesafiLogo
                  tone="dark"
                  payAccent="emerald"
                  variant="transparent"
                  className="h-16 w-auto"
                />
              </Link>
            )}
            <div className="flex items-center gap-2">
              {/* Sidebar Collapse Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex h-9 w-9 p-0 hover:bg-accent"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="h-5 w-5" />
                ) : (
                  <PanelLeftClose className="h-5 w-5" />
                )}
              </Button>
              {/* Mobile Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 p-0"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-l-2 border-emerald-500'
                      : 'text-muted-foreground hover:bg-zinc-800/80 hover:text-foreground'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="p-3 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full px-3 ${sidebarCollapsed ? 'justify-center' : 'justify-start'}`}
                >
                  <Avatar className={`h-8 w-8 ${sidebarCollapsed ? '' : 'mr-2'}`}>
                    {user?.user_metadata?.avatar_url && (
                      <AvatarImage src={user.user_metadata.avatar_url} />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-orange-500 text-white text-xs">
                      {user?.email?.[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {!sidebarCollapsed && (
                    <>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user?.user_metadata?.name || user?.email?.split('@')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user?.email}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/business/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  <Building2 className="h-4 w-4 mr-2" />
                  Switch to Personal
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Mobile header */}
        <header className="sticky top-0 z-30 lg:hidden bg-background border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex-1" /> {/* Spacer */}
            <PesafiLogo
              tone="dark"
              payAccent="emerald"
              variant="transparent"
              className="h-16 w-auto"
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-screen p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
