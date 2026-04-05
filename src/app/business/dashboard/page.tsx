'use client';

import { useEffect, useState } from "react";
import { useSupabaseAuth, supabaseAuthClient } from "@/lib/supabase-auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  Users,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
} from "lucide-react";
import { useAutoWallet } from "@/hooks/useAutoWallet";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";

export default function BusinessDashboardPage() {
  const { user } = useSupabaseAuth();
  const { walletAddress, balance, isLoading, refreshBalance } = useAutoWallet('business');
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalVolume: 0,
    totalReceived: 0,
    totalSent: 0,
    uniqueCustomers: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [preferredCurrency, setPreferredCurrency] = useState('KES');
  const { formatLocalAmount } = useCurrencyConversion(preferredCurrency);

  useEffect(() => {
    fetchBusinessData();
  }, [user]);

  const fetchBusinessData = async () => {
    if (!user) return;

    try {
      // Fetch business profile
      const { data: profile } = await supabaseAuthClient
        .from('business_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setBusinessProfile(profile);
      }

      // Fetch business preferences
      const { data: prefs } = await supabaseAuthClient
        .from('business_preferences')
        .select('currency')
        .eq('business_id', profile?.id)
        .single();

      if (prefs?.currency) {
        setPreferredCurrency(prefs.currency);
      }

      // Fetch recent transactions
      const { data: wallet } = await supabaseAuthClient
        .from('wallet')
        .select('id')
        .eq('user_id', user.id)
        .eq('wallet_type', 'business')
        .single();

      if (wallet) {
        const { data: transactions } = await supabaseAuthClient
          .from('transaction')
          .select('*')
          .eq('wallet_id', wallet.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (transactions) {
          setRecentTransactions(transactions);

          // Calculate stats
          const completed = transactions.filter(t => t.status === 'completed');
          const totalVol = completed.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
          const received = completed.filter(t => t.type === 'receive' || t.type === 'deposit');
          const sent = completed.filter(t => t.type === 'send' || t.type === 'withdraw');

          setStats({
            totalTransactions: completed.length,
            totalVolume: totalVol,
            totalReceived: received.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0),
            totalSent: sent.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0),
            uniqueCustomers: new Set(received.map(t => t.metadata?.senderAddress)).size,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching business data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshBalance(), fetchBusinessData()]);
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {businessProfile?.business_name}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
          <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/80">Balance</CardTitle>
            <div className="p-2 rounded-lg bg-white/15">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${balance.toFixed(2)}</div>
            <p className="text-xs text-white/70">
              ≈ {formatLocalAmount(balance)}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
          <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/80">Total Volume</CardTitle>
            <div className="p-2 rounded-lg bg-white/15">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalVolume.toFixed(2)}</div>
            <p className="text-xs text-white/70">
              {stats.totalTransactions} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20">
          <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/80">Received</CardTitle>
            <div className="p-2 rounded-lg bg-white/15">
              <ArrowDownLeft className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalReceived.toFixed(2)}
            </div>
            <p className="text-xs text-white/70">
              From customers
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20">
          <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/80">Sent</CardTitle>
            <div className="p-2 rounded-lg bg-white/15">
              <ArrowUpRight className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalSent.toFixed(2)}
            </div>
            <p className="text-xs text-white/70">
              Payments & withdrawals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        tx.type === 'receive' || tx.type === 'deposit'
                          ? 'bg-emerald-500/15'
                          : 'bg-orange-100'
                      }`}
                    >
                      {tx.type === 'receive' || tx.type === 'deposit' ? (
                        <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium capitalize">{tx.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        tx.type === 'receive' || tx.type === 'deposit'
                          ? 'text-emerald-500'
                          : 'text-foreground'
                      }`}
                    >
                      {tx.type === 'receive' || tx.type === 'deposit' ? '+' : '-'}
                      ${parseFloat(tx.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
