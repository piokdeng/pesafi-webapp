"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { BusinessRegisterForm } from "@/components/auth/BusinessRegisterForm";
import { ArrowLeft, User, Building2 } from "lucide-react";
import { PesafiLogo } from "@/components/PesafiLogo";

export default function Page() {
  const [accountType, setAccountType] = useState<'individual' | 'business' | null>(null);

  const resetAccountType = () => setAccountType(null);

  if (!accountType) {
    return (
      <div className="min-h-screen grid place-items-center px-4 py-8 bg-background">
        <div className="w-full max-w-2xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-400 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <Card className="w-full border-zinc-800 bg-card/80 shadow-xl shadow-black/20">
            <CardHeader className="space-y-4">
              <div className="flex justify-center">
                <PesafiLogo
                  tone="dark"
                  payAccent="emerald"
                  variant="transparent"
                  className="h-36 w-auto"
                />
              </div>
              <div className="text-center space-y-2">
                <CardTitle className="text-2xl">Create your account</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose the type of account you want to create
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card
                  className="cursor-pointer border-zinc-800 bg-card/60 hover:border-emerald-500/50 transition-colors"
                  onClick={() => setAccountType('individual')}
                >
                  <CardContent className="pt-6 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/25">
                      <User className="h-8 w-8 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Individual Account</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Perfect for personal use. Send, receive, and manage your money.
                      </p>
                    </div>
                    <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold">
                      Create Individual Account
                    </Button>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer border-zinc-800 bg-card/60 hover:border-orange-500/50 transition-colors"
                  onClick={() => setAccountType('business')}
                >
                  <CardContent className="pt-6 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-orange-500/15 flex items-center justify-center ring-1 ring-orange-500/25">
                      <Building2 className="h-8 w-8 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Business Account</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Accept payments, manage team, and grow your business.
                      </p>
                    </div>
                    <Button className="w-full bg-orange-500 hover:bg-orange-400 text-zinc-950 font-semibold">
                      Create Business Account
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-emerald-400 hover:underline">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-8 bg-background">
      <div className="w-full max-w-2xl">
        <Button
          variant="ghost"
          onClick={resetAccountType}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-400 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to account type
        </Button>
        <Card className="w-full border-zinc-800 bg-card/80 shadow-xl shadow-black/20">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <PesafiLogo
                tone="dark"
                payAccent="emerald"
                variant="transparent"
                className="h-28 w-auto"
              />
            </div>
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl">
                Create {accountType === 'business' ? 'Business' : 'Individual'} Account
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {accountType === 'business'
                  ? 'Get started with KermaPay Business'
                  : 'Join KermaPay and start managing your money'}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {accountType === 'individual' ? <RegisterForm /> : <BusinessRegisterForm />}
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-400 hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}