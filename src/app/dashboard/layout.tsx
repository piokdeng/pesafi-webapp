"use client";

import { PublicPageShell } from "@/components/PublicPageShell";

/**
 * Same chrome as the public site (nav, search, background) so logged-in
 * routes match the pre-login KermaPay experience.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicPageShell>{children}</PublicPageShell>;
}
