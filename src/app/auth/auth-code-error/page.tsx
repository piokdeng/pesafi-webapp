import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen grid place-items-center px-4 py-8 bg-background">
      <div className="w-full max-w-md">
        <Card className="w-full border-zinc-800 bg-card/80 shadow-xl shadow-black/20">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="h-12 w-12 text-red-400" />
            </div>
            <CardTitle className="text-center text-2xl text-foreground">
              Authentication error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                There was an error with your authentication. This could be due to:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 text-left">
                <li>• Invalid or expired verification link</li>
                <li>• Network connectivity issues</li>
                <li>• Browser security settings</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                asChild
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold"
              >
                <Link href="/login">Try signing in again</Link>
              </Button>

              <div className="text-center">
                <Link
                  href="/register"
                  className="text-sm text-emerald-400 hover:underline"
                >
                  Create a new account
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
