'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FxRateDisplay } from '@/components/FxRateDisplay';
import {
  kermapaySspPerUsd,
  sspToUsd,
  SSP_FX_CONFIG,
} from '@/lib/fx-ssp';
import { toast } from 'sonner';

export default function DashboardFxPage() {
  const [sspAmount, setSspAmount] = useState('1000000');

  const parsedSsp = useMemo(() => {
    const n = parseFloat(sspAmount.replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [sspAmount]);

  const usdOut = useMemo(() => sspToUsd(parsedSsp), [parsedSsp]);
  const rate = kermapaySspPerUsd();

  const handleRequest = () => {
    if (parsedSsp <= 0) {
      toast.error('Enter a valid SSP amount');
      return;
    }
    toast.message('FX request', {
      description:
        'Settlement via mobile money and treasury rails is coming online. Your quote is for planning only until onboarding is complete.',
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Wallet
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">South Sudan FX</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Convert SSP to USDC at the published KermaPay rate. Pay in through
          mobile money; dollars credit to this wallet after treasury
          confirmation (rollout staged by market).
        </p>
      </div>

      <FxRateDisplay surface="light" className="border-zinc-800" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-emerald-500" />
              Estimate conversion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ssp">You pay (SSP)</Label>
              <Input
                id="ssp"
                inputMode="decimal"
                value={sspAmount}
                onChange={(e) => setSspAmount(e.target.value)}
                placeholder="e.g. 1000000"
              />
            </div>
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <p className="text-muted-foreground">You receive (approx.)</p>
              <p className="text-2xl font-semibold tabular-nums">
                {parsedSsp > 0 ? `USDC ${usdOut.toFixed(2)}` : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                At ~{Math.round(rate).toLocaleString()} SSP per 1 USD (
                {SSP_FX_CONFIG.spreadOverMid * 100}% spread over illustrative
                mid)
              </p>
            </div>
            <Button
              type="button"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold"
              onClick={handleRequest}
            >
              Request conversion
            </Button>
            <p className="text-xs text-muted-foreground">
              This action reserves your intent; operations will confirm KYC,
              limits, and mobile-money receipt as we enable South Sudan
              production flows.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-orange-500" />
              Business FX
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Companies and NGOs can open a Business FX line: deposit operating
              SSP, convert at a locked screen rate, and pay suppliers from the
              same ledger—keeping audits clean.
            </p>
            <Button variant="outline" asChild className="w-full mt-2">
              <Link href="mailto:hello@kermapay.com?subject=Business%20FX%20account">
                Talk to us about Business FX
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
