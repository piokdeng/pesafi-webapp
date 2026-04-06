"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { BusinessRegisterForm } from "@/components/auth/BusinessRegisterForm";
import { ArrowLeft, User, Building2 } from "lucide-react";
import { PesafiLogoCompact } from "@/components/PesafiLogo";
import { PublicPageShell } from "@/components/PublicPageShell";

const authCardClass =
  "border-border/80 bg-card/85 shadow-xl shadow-sky-950/15 ring-1 ring-sky-500/10 backdrop-blur-sm";

export default function Page() {
  const [accountType, setAccountType] = useState<"individual" | "business" | null>(null);

  const resetAccountType = () => setAccountType(null);

  if (!accountType) {
    return (
      <PublicPageShell>
        <div className="flex min-h-[calc(100vh-5.5rem)] flex-col items-center justify-center py-10 sm:py-14">
          <div className="w-full max-w-2xl">
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
                <div className="space-y-2 text-center">
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    Create your account
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose the type of account you want to create
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card
                    className="cursor-pointer rounded-xl border-border/60 bg-card/50 transition-colors hover:border-emerald-500/40"
                    onClick={() => setAccountType("individual")}
                  >
                    <CardContent className="space-y-4 pt-6 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/25">
                        <User className="h-8 w-8 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Individual account</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Personal wallet, send, receive, and manage your money.
                        </p>
                      </div>
                      <Button className="w-full bg-emerald-500 font-semibold text-zinc-950 hover:bg-emerald-400">
                        Create individual account
                      </Button>
                    </CardContent>
                  </Card>

                  <Card
                    className="cursor-pointer rounded-xl border-border/60 bg-card/50 transition-colors hover:border-orange-500/40"
                    onClick={() => setAccountType("business")}
                  >
                    <CardContent className="space-y-4 pt-6 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/15 ring-1 ring-orange-500/25">
                        <Building2 className="h-8 w-8 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Business account</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Payments, team, and treasury tools for your company.
                        </p>
                      </div>
                      <Button className="w-full bg-orange-500 font-semibold text-zinc-950 hover:bg-orange-400">
                        Create business account
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <p className="pt-2 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-emerald-400 hover:underline">
                    Sign in
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <div className="flex min-h-[calc(100vh-5.5rem)] flex-col items-center justify-center py-10 sm:py-14">
        <div className="w-full max-w-2xl">
          <Button
            variant="ghost"
            onClick={resetAccountType}
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to account type
          </Button>
          <Card className={`w-full rounded-2xl ${authCardClass}`}>
            <CardHeader className="space-y-4 pb-2">
              <div className="flex justify-center pt-2">
                <PesafiLogoCompact tone="dark" payAccent="emerald" className="text-3xl sm:text-4xl" />
              </div>
              <div className="space-y-2 text-center">
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  Create {accountType === "business" ? "business" : "individual"} account
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {accountType === "business"
                    ? "Get started with KermaPay Business"
                    : "Join KermaPay and start managing your money"}
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {accountType === "individual" ? <RegisterForm /> : <BusinessRegisterForm />}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-emerald-400 hover:underline">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicPageShell>
  );
}
