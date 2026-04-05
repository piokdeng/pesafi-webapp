import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { ArrowLeft } from "lucide-react";
import { PesafiLogo } from "@/components/PesafiLogo";
import { Suspense } from "react";

export default function Page() {
  return (
    <div className="min-h-screen grid place-items-center px-4 py-8 bg-background">
      <div className="w-full max-w-md">
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
            <CardTitle className="text-center text-2xl">Welcome back</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="py-8">Loading...</div>}>
              <LoginForm />
            </Suspense>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              New here?{" "}
              <Link href="/register" className="text-emerald-400 hover:underline">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}