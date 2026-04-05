"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PesafiLogo } from "@/components/PesafiLogo";
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const error = searchParams.get("error");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const getErrorMessage = () => {
    switch (error) {
      case "invalid-link":
        return "Invalid verification link. Please try again.";
      case "user-not-found":
        return "User not found. Please check your email address.";
      case "invalid-token":
        return "Invalid verification token. Please request a new verification email.";
      case "verification-failed":
        return "Verification failed. Please try again.";
      default:
        return null;
    }
  };

  const errorMessage = getErrorMessage();

  const handleResendEmail = async () => {
    if (!email) return;
    
    setResendLoading(true);
    try {
      // Call the resend email API
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 3000);
      } else {
        console.error("Failed to resend verification email");
      }
    } catch (error) {
      console.error("Error resending verification email:", error);
    } finally {
      setResendLoading(false);
    }
  };

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
            <CardTitle className="text-center text-2xl">Verify your email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {errorMessage && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-red-300">
                      Verification Error
                    </p>
                    <p className="mt-1 text-red-200/90">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-emerald-500/15 rounded-full ring-1 ring-emerald-500/25">
                  <Mail className="h-8 w-8 text-emerald-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Check your email</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent a verification link to:
                </p>
                <p className="font-medium text-emerald-400">{email}</p>
              </div>
              
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleResendEmail}
                disabled={resendLoading || resendSuccess}
                className="w-full"
                variant="outline"
              >
                {resendLoading ? "Sending..." : resendSuccess ? "Email sent!" : "Resend verification email"}
              </Button>
              
              <div className="text-center">
                <Link 
                  href="/login" 
                  className="text-sm text-emerald-400 hover:underline"
                >
                  Already verified? Sign in
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen grid place-items-center px-4 py-8 bg-background">
        <div className="w-full max-w-md">
          <Card className="w-full border-zinc-800 bg-card/80">
            <CardHeader className="space-y-4">
              <div className="flex justify-center">
                <PesafiLogo
                  tone="dark"
                  payAccent="emerald"
                  variant="transparent"
                  className="h-36 w-auto"
                />
              </div>
              <CardTitle className="text-center text-2xl">Verify your email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
