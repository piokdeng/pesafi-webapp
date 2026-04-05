"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";

export function FooterNewsletterForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setBusy(true);
    const subject = encodeURIComponent("Newsletter signup");
    const body = encodeURIComponent(`Please add this address to KermaPay updates:\n\n${trimmed}\n`);
    window.location.href = `mailto:hello@kermapay.com?subject=${subject}&body=${body}`;
    toast.success("Opening your email app… Send the message to complete signup.");
    setBusy(false);
    setEmail("");
  };

  return (
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
      <div className="relative flex-1">
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          className="h-12 bg-zinc-900/50 border-zinc-700"
          autoComplete="email"
          disabled={busy}
        />
      </div>
      <Button
        variant="secondary"
        type="submit"
        disabled={busy}
        className="h-12 px-6 sm:px-8 bg-orange-500 hover:bg-orange-400 text-zinc-950 border-0 font-medium shadow-lg shadow-orange-500/20"
      >
        Subscribe
      </Button>
    </form>
  );
}
