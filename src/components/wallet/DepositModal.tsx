'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CreditCard,
  Smartphone,
  Building2,
  Copy,
  Check,
  ExternalLink,
  Zap,
  DollarSign,
  Loader2,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabaseAuthClient } from '@/lib/supabase-auth-client';

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  onDepositSuccess?: () => void;
}

export default function DepositModal({ open, onOpenChange, walletAddress, onDepositSuccess }: DepositModalProps) {
  const [amount, setAmount] = useState('50');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCoinbaseOnrampDeposit = async () => {
    setLoading(true);

    try {
      await openCoinbaseOnramp(parseFloat(amount));
    } catch (error) {
      console.error('Coinbase deposit error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCoinbaseOnramp = async (amount: number) => {
    try {
      const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const { data: { session } } = await supabaseAuthClient.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in to deposit funds');
      }

      const { data: { user } } = await supabaseAuthClient.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to deposit funds');
      }

      const response = await fetch(`${apiBaseUrl}/api/coinbase/session-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          walletAddress: walletAddress,
          amount: amount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session token');
      }

      const { sessionToken } = await response.json();
      const redirectUrl = encodeURIComponent(`${apiBaseUrl}/dashboard`);
      const partnerUserId = user.id;
      const appId = process.env.NEXT_PUBLIC_COINBASE_PROJECT_ID || '';
      const widgetUrl = `https://pay.coinbase.com/buy/select-asset?sessionToken=${sessionToken}&appId=${appId}&defaultAsset=USDC&defaultNetwork=base&presetFiatAmount=${amount}&redirectUrl=${redirectUrl}&partnerUserId=${partnerUserId}`;

      const newWindow = window.open(widgetUrl, '_blank', 'width=500,height=700');

      if (!newWindow) {
        throw new Error('Please allow popups for Coinbase Onramp');
      }

      onOpenChange(false);
      toast.success('Coinbase Onramp opened! Complete your purchase in the new window.');
    } catch (error) {
      console.error('Coinbase Onramp error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to open Coinbase Onramp');
      throw error;
    }
  };

  const quickAmounts = ['10', '25', '50', '100', '250', '500'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl">Add Money to Your Wallet</DialogTitle>
          <DialogDescription>
            Choose your preferred payment method to deposit USDC
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="card" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="card">
              <CreditCard className="h-4 w-4 mr-2" />
              Card
            </TabsTrigger>
            <TabsTrigger value="mobile">
              <Smartphone className="h-4 w-4 mr-2" />
              Mobile Money
            </TabsTrigger>
            <TabsTrigger value="bank">
              <Building2 className="h-4 w-4 mr-2" />
              Bank
            </TabsTrigger>
          </TabsList>

          {/* Card Payment (Coinbase) */}
          <TabsContent value="card" className="space-y-4 h-[450px] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Instant Deposit
                </CardTitle>
                <CardDescription>
                  Buy USDC with credit/debit card - Powered by Coinbase
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Amount Selection */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-9"
                      placeholder="50"
                      min="10"
                      max="10000"
                    />
                  </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map((amt) => (
                    <Button
                      key={amt}
                      variant={amount === amt ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAmount(amt)}
                      className={amount === amt ? 'bg-green-600 hover:bg-green-500' : ''}
                    >
                      ${amt}
                    </Button>
                  ))}
                </div>

                {/* Fee Info */}
                <div className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">${amount}</span>
                  </div>
                  <div className="flex justify-between text-emerald-500">
                    <span className="text-muted-foreground">Fee:</span>
                    <span className="font-medium">$0.00</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="font-semibold">You receive:</span>
                    <span className="font-semibold text-emerald-500">${amount} USDC</span>
                  </div>
                </div>

                {/* Buy Button */}
                <Button
                  onClick={handleCoinbaseOnrampDeposit}
                  disabled={loading || !amount || parseFloat(amount) < 10}
                  className="w-full bg-green-600 hover:bg-green-500"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Opening Coinbase...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Buy ${amount} USDC
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Powered by Coinbase | Zero fees on Base | Secure payment
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mobile Money - Coming Soon */}
          <TabsContent value="mobile" className="space-y-4 h-[450px] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Mobile Money Deposit
                </CardTitle>
                <CardDescription>
                  M-Pesa, MTN Mobile Money, Airtel Money
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                    <Clock className="h-8 w-8 text-amber-600" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Coming Soon</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Mobile money deposits via M-Pesa, MTN, and Airtel are being set up.
                      Use card payment for now.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-4">
                    <span className="px-3 py-1 bg-muted rounded-full text-xs">M-Pesa</span>
                    <span className="px-3 py-1 bg-muted rounded-full text-xs">MTN MoMo</span>
                    <span className="px-3 py-1 bg-muted rounded-full text-xs">Airtel Money</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Transfer */}
          <TabsContent value="bank" className="space-y-4 h-[450px] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Direct Transfer</CardTitle>
                <CardDescription>
                  Send USDC directly from another wallet or exchange
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Wallet Address (Base Network)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={walletAddress}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyAddress}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg space-y-2">
                  <p className="font-semibold text-yellow-900">
                    Important Instructions:
                  </p>
                  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Only send <strong>USDC</strong> to this address</li>
                    <li>Use <strong>Base Network</strong> (not Ethereum or other chains)</li>
                    <li>Minimum deposit: $10 USDC</li>
                    <li>Funds arrive in 1-5 minutes</li>
                    <li>No fees for direct transfers</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Where to buy USDC:</p>
                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => window.open('https://www.coinbase.com', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Coinbase
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => window.open('https://www.binance.com', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Binance
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
