"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { ArrowLeft } from "lucide-react";
import { PesafiLogoCompact } from "@/components/PesafiLogo";
import { PublicPageShell } from "@/components/PublicPageShell";

const authCardClass =
  "border-border/80 bg-card/85 shadow-xl shadow-sky-950/15 ring-1 ring-sky-500/10 backdrop-blur-sm";

export default function Page() {
  return (
    <PublicPageShell>
      <div className="flex min-h-[calc(100vh-5.5rem)] flex-col items-center justify-center py-10 sm:py-14">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <Card className={`w-full rounded-2xl ${authCardClass}`}>
            <CardHeader className="space-y-4 pb-2">
              <div className="flex justify-center pt-2">
                <PesafiLogoCompact tone="dark" payAccent="emerald" className="text-3xl sm:text-4xl" />
              </div>
              <CardTitle className="text-center text-2xl font-semibold tracking-tight">
                Welcome back
              </CardTitle>
              <p className="text-center text-sm text-muted-foreground">
                Sign in to open your wallet, FX tools, and activity.
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              <Suspense fallback={<div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>}>
                <LoginForm />
              </Suspense>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                New here?{" "}
                <Link href="/register" className="font-medium text-emerald-400 hover:underline">
                  Create an account
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicPageShell>
  );
}
