import type { Metadata } from "next";
import "./globals.css";
import VisualEditsMessenger from "@/visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { OnchainProviders } from "@/providers/OnchainProviders";

export const metadata: Metadata = {
  title: "KermaPay — Digital FX & wallets for Africa",
  description:
    "Convert SSP to USDC at a published rate, hold dollars in-app, and pay across borders. Built for South Sudan and East Africa.",
  keywords: [
    "fintech",
    "South Sudan",
    "SSP",
    "FX",
    "USDC",
    "mobile money",
    "cross-border payments",
    "digital wallet",
    "KermaPay",
  ],
  authors: [{ name: "KermaPay" }],
  openGraph: {
    title: "KermaPay — Digital FX & wallets for Africa",
    description:
      "Transparent South Sudan FX, USDC wallets, and mobile-money rails—fairer than the street, built for scale.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "KermaPay — Digital FX & wallets for Africa",
    description:
      "Transparent South Sudan FX, USDC wallets, and mobile-money rails.",
  },
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <OnchainProviders>
            <ErrorReporter />
            <Script
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
              strategy="afterInteractive"
              data-target-origin="*"
              data-message-type="ROUTE_CHANGE"
              data-include-search-params="true"
              data-only-in-iframe="true"
              data-debug="true"
              data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
            />
            <Toaster />
            {children}
            <VisualEditsMessenger />
          </OnchainProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
