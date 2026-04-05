"use client";
import { Toaster as SonnerToaster } from "sonner";
export { toast } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      richColors
      position="top-center"
      closeButton
      expand
      duration={3500}
    />
  );
}