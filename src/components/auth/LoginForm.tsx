"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Trash2, Eye, EyeOff, User, Building2 } from "lucide-react";
import { supabaseAuthClient } from "@/lib/supabase-auth-client";

export const LoginForm = () => {
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get("redirect") || "/dashboard";
  const message = search.get("message");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", rememberMe: true });
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<'individual' | 'business'>('individual');

  const clearAuthData = async () => {
    try {
      // Clear Supabase auth data
      await supabaseAuthClient.auth.signOut();

      // Clear localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('clerk') || key.includes('sb-') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('clerk') || key.includes('sb-') || key.includes('auth')) {
          sessionStorage.removeItem(key);
        }
      });

      toast.success("Authentication data cleared. Please refresh the page.");
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      toast.error("Failed to clear auth data");
    }
  };

  useEffect(() => {
    if (message === "email-verified") {
      toast.success("Email verified successfully! You can now sign in.");
    } else if (message === "already-verified") {
      toast.info("Your email is already verified. You can sign in.");
    } else if (message === "clear-auth" || message === "no-session" || message === "session-corrupted") {
      // Clear any existing Supabase session and storage
      supabaseAuthClient.auth.signOut().then(() => {
        // Clear localStorage and sessionStorage
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('clerk') || key.includes('sb-') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });

        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('clerk') || key.includes('sb-') || key.includes('auth')) {
            sessionStorage.removeItem(key);
          }
        });

        toast.info("Authentication data cleared. Please sign in again.");
      });
    }
  }, [message]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Sign in directly on the client so Supabase persists the session
      const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) {
        toast.error(error.message || "Login failed. Please try again.");
        return;
      }

      // Check if user has business account
      if (accountType === 'business') {
        // Verify user has a business account
        const { data: businessProfile, error: bizError } = await supabaseAuthClient
          .from('business_profile')
          .select('id')
          .eq('user_id', data.user.id)
          .single();

        if (bizError || !businessProfile) {
          toast.error("No business account found. Please sign up for a business account or use individual login.");
          await supabaseAuthClient.auth.signOut();
          setLoading(false);
          return;
        }

        toast.success("Welcome back to KermaPay Business!");
        router.push('/business/dashboard');
      } else {
        toast.success("Welcome back!");
        router.push(redirect);
      }
    } catch (err) {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Account Type Toggle */}
      <div className="space-y-2">
        <Label>Account Type</Label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
          <Button
            type="button"
            variant={accountType === 'individual' ? 'default' : 'ghost'}
            className={`${accountType === 'individual' ? 'bg-background shadow-sm' : ''}`}
            onClick={() => setAccountType('individual')}
          >
            <User className="h-4 w-4 mr-2" />
            Individual
          </Button>
          <Button
            type="button"
            variant={accountType === 'business' ? 'default' : 'ghost'}
            className={`${accountType === 'business' ? 'bg-background shadow-sm' : ''}`}
            onClick={() => setAccountType('business')}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Business
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            required
            autoComplete="off"
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.rememberMe}
            onChange={(e) => setForm((p) => ({ ...p, rememberMe: e.target.checked }))}
          />
          Remember me
        </label>
        <Button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </div>
    </form>
  );
};