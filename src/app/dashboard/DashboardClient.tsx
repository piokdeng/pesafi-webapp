"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/lib/supabase-auth-client";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

export const DashboardClient = () => {
  const { user, loading, signOut } = useSupabaseAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed out");
      router.push("/");
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold">Hi {user.user_metadata?.name || user.email}</h2>
        <p className="mt-2 text-muted-foreground">Welcome to your KermaPay wallet dashboard.</p>
      </div>
      <div className="flex gap-3">
        <Button className="bg-green-600 hover:bg-green-500" onClick={() => toast.info("Coming soon: Add funds via mobile money/on-ramp")}>Add funds</Button>
        <Button variant="outline" onClick={() => toast.info("Coming soon: Scan & Pay with Stablecoins on Base")}>Scan & Pay</Button>
        <Button variant="ghost" onClick={handleSignOut}>Sign out</Button>
      </div>
      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Balances and recent activity will appear here. Base L2 and stablecoin features are being wired in.</p>
      </div>
    </div>
  );
};

export default DashboardClient;