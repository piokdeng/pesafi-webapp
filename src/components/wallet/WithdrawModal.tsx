'use client';

import { useState } from 'react';
import { supabaseAuthClient } from '@/lib/supabase-auth-client';
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
  Smartphone,
  Building2,
  Loader2,
  DollarSign,
  CreditCard,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
  walletAddress: string;
}

export default function WithdrawModal({ open, onOpenChange, balance, walletAddress }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCoinbaseOfframp = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > balance) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      await openCoinbaseOfframp(parseFloat(amount));
    } catch (error) {
      console.error('Coinbase Offramp error:', error);
      toast.error('Failed to open Coinbase Offramp');
    } finally {
      setLoading(false);
    }
  };

  const openCoinbaseOfframp = async (amount: number) => {
    try {
      const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const { data: { session } } = await supabaseAuthClient.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please sign in to withdraw funds');
      }

      const { data: { user } } = await supabaseAuthClient.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to withdraw funds');
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
      const widgetUrl = `https://pay.coinbase.com/v3/sell/input?sessionToken=${sessionToken}&presetCryptoAmount=${amount}&redirectUrl=${redirectUrl}&partnerUserId=${partnerUserId}`;

      const newWindow = window.open(widgetUrl, '_blank', 'width=500,height=700');

      if (!newWindow) {
        throw new Error('Please allow popups for Coinbase Offramp');
      }

      onOpenChange(false);
      toast.success('Coinbase Offramp opened! Complete your withdrawal in the new window.');
    } catch (error) {
      console.error('Coinbase Offramp error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to open Coinbase Offramp');
      throw error;
    }
  };

  const quickAmounts = ['10', '25', '50', '100', 'All'];

  const handleQuickAmount = (amt: string) => {
    if (amt === 'All') {
      setAmount(balance.toFixed(2));
    } else {
      setAmount(amt);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl">Withdraw Money</DialogTitle>
          <DialogDescription>
            Send money to your bank account or mobile money
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 p-3 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Available Balance:</span>
            <span className="text-lg font-semibold text-emerald-500">
              ${balance.toFixed(2)} USDC
            </span>
          </div>
        </div>

        <Tabs defaultValue="coinbase" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="coinbase">
              <CreditCard className="h-4 w-4 mr-2" />
              Coinbase
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

          {/* Coinbase Offramp */}
          <TabsContent value="coinbase" className="space-y-4 h-[400px] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Coinbase Offramp
                  <span className="text-xs bg-zinc-100 text-zinc-800 px-2 py-1 rounded">
                    US/EU Only
                  </span>
                </CardTitle>
                <CardDescription>
                  Convert USDC to USD and send to US/EU bank accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="coinbase-amount">Amount (USDC)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="coinbase-amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-9"
                      placeholder="100"
                      min="10"
                      max={balance.toString()}
                    />
                  </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-5 gap-2">
                  {quickAmounts.map((amt) => (
                    <Button
                      key={amt}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAmount(amt)}
                      disabled={amt !== 'All' && parseFloat(amt) > balance}
                    >
                      {amt === 'All' ? 'All' : `$${amt}`}
                    </Button>
                  ))}
                </div>

                {/* Fee Info */}
                {amount && parseFloat(amount) > 0 && (
                  <div className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-medium">${parseFloat(amount).toFixed(2)} USDC</span>
                    </div>
                    <div className="flex justify-between text-emerald-500">
                      <span className="text-muted-foreground">Fee:</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 mt-1">
                      <span className="font-semibold">You receive:</span>
                      <span className="font-semibold text-emerald-500">
                        ${parseFloat(amount).toFixed(2)} USD
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                      Zero fees for USDC on Base
                    </p>
                  </div>
                )}

                {/* Withdraw Button */}
                <Button
                  onClick={handleCoinbaseOfframp}
                  disabled={loading || !amount || parseFloat(amount) > balance}
                  className="w-full bg-zinc-700 hover:bg-zinc-600"
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
                      Open Coinbase Offramp
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mobile Money - Coming Soon */}
          <TabsContent value="mobile" className="space-y-4 h-[400px] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Mobile Money Withdrawal
                </CardTitle>
                <CardDescription>
                  Send to M-Pesa, MTN Mobile Money, Airtel Money
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
                      Mobile money withdrawals via M-Pesa, MTN, and Airtel are being set up.
                      Use Coinbase for US/EU withdrawals.
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

          {/* Bank Account - Coming Soon */}
          <TabsContent value="bank" className="space-y-4 h-[400px] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Bank Transfer</CardTitle>
                <CardDescription>
                  Transfer to African bank accounts
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
                      Bank withdrawals for African banks are being set up.
                      Use Coinbase for US/EU bank withdrawals.
                    </p>
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
