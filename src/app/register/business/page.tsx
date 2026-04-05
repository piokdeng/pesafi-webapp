import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { BusinessRegisterForm } from "@/components/auth/BusinessRegisterForm";
import { ArrowLeft } from "lucide-react";
import { PesafiLogo } from "@/components/PesafiLogo";
import { Suspense } from "react";

export default function Page() {
  return (
    <div className="min-h-screen grid place-items-center px-4 py-8 bg-background">
      <div className="w-full max-w-2xl">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-400 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to account type
        </Link>
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
              <CardTitle className="text-2xl">Create Business Account</CardTitle>
              <p className="text-sm text-muted-foreground">
                Get started with KermaPay Business for payments, invoicing, and more
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="py-8">Loading...</div>}>
              <BusinessRegisterForm />
            </Suspense>
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
