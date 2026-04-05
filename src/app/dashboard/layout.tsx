'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSupabaseAuth, supabaseAuthClient } from "@/lib/supabase-auth-client";
import {
  User,
  Users,
  Settings,
  LogOut,
  Bell,
  Building2,
  Banknote,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PesafiLogoCompact } from "@/components/PesafiLogo";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, signOut } = useSupabaseAuth();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [hasBusinessProfile, setHasBusinessProfile] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabaseAuthClient
      .from('business_profile')
      .select('id')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setHasBusinessProfile(!!data);
      });
  }, [user?.id]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-24 items-center justify-between px-4 max-w-6xl mx-auto">
          {/* KermaPay (left) */}
          <Link href="/dashboard" className="flex-shrink-0 -ml-7">
            <PesafiLogoCompact
              tone="dark"
              payAccent="emerald"
              variant="transparent"
              className="h-20 w-auto"
            />
          </Link>

          {/* User Profile Avatar (right) */}
          <Button
            variant="ghost"
            className="flex items-center px-2"
            onClick={() => setProfileDialogOpen(true)}
          >
            <Avatar className="h-12 w-12 ring-1 ring-emerald-500/30">
              {user?.user_metadata?.avatar_url && <AvatarImage src={user.user_metadata.avatar_url} alt="Profile" className="object-cover brightness-110" />}
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-orange-500 text-white font-semibold text-sm">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </div>
      </header>

      {/* Profile Dialog - Centered with Blur */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>User Profile Menu</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            {/* User Info Section */}
            <div className="flex items-center gap-3 px-3 py-4 rounded-lg bg-secondary/50 mb-4">
              <Avatar className="h-12 w-12 ring-2 ring-primary/10 shadow-md">
                {user?.user_metadata?.avatar_url && <AvatarImage src={user.user_metadata.avatar_url} alt="Profile" className="object-cover" />}
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-orange-500 text-white font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-1 flex-1 min-w-0">
                <p className="text-sm font-semibold leading-none truncate">
                  {user?.user_metadata?.name || 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="space-y-2">
              <Link
                href="/fx"
                className="flex items-center cursor-pointer px-3 py-2.5 rounded-md transition-colors hover:bg-accent"
                onClick={() => setProfileDialogOpen(false)}
              >
                <Banknote className="mr-3 h-4 w-4" />
                <span className="font-medium">Live FX (SSP/USD)</span>
              </Link>
              <Link 
                href="/dashboard/profile" 
                className="flex items-center cursor-pointer px-3 py-2.5 rounded-md transition-colors hover:bg-accent"
                onClick={() => setProfileDialogOpen(false)}
              >
                <User className="mr-3 h-4 w-4" />
                <span className="font-medium">Profile</span>
              </Link>
              <Link
                href="/dashboard/contacts"
                className="flex items-center cursor-pointer px-3 py-2.5 rounded-md transition-colors hover:bg-accent"
                onClick={() => setProfileDialogOpen(false)}
              >
                <Users className="mr-3 h-4 w-4" />
                <span className="font-medium">Contacts</span>
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center cursor-pointer px-3 py-2.5 rounded-md transition-colors hover:bg-accent"
                onClick={() => setProfileDialogOpen(false)}
              >
                <Settings className="mr-3 h-4 w-4" />
                <span className="font-medium">Settings</span>
              </Link>
              <Link 
                href="/dashboard/notifications" 
                className="flex items-center cursor-pointer px-3 py-2.5 rounded-md transition-colors hover:bg-accent"
                onClick={() => setProfileDialogOpen(false)}
              >
                <Bell className="mr-3 h-4 w-4" />
                <span className="font-medium">Notifications</span>
              </Link>
            </div>

            {/* Switch to Business - only for users with a business profile */}
            {hasBusinessProfile && (
              <Link
                href="/business/dashboard"
                className="flex items-center cursor-pointer px-3 py-2.5 rounded-md transition-colors hover:bg-accent"
                onClick={() => setProfileDialogOpen(false)}
              >
                <Building2 className="mr-3 h-4 w-4" />
                <span className="font-medium">Switch to Business</span>
              </Link>
            )}

            {/* Separator */}
            <div className="my-4 border-t border-border" />

            {/* Logout */}
            <div
              onClick={() => {
                setProfileDialogOpen(false);
                handleSignOut();
              }}
              className="text-red-600 cursor-pointer px-3 py-2.5 rounded-md transition-colors font-medium hover:bg-red-50"
            >
              <LogOut className="mr-3 h-4 w-4 inline" />
              <span>Log out</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto px-4 pt-4 pb-8">
        {children}
      </main>
    </div>
  );
}
