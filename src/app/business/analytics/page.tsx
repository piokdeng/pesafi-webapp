'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownLeft, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function BusinessAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [teamCount, setTeamCount] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Load transactions
      const txResponse = await fetch('/api/business/transactions?limit=1000');
      const txData = await txResponse.json();

      if (txResponse.ok) {
        setTransactions(txData.transactions || []);
        setWallet(txData.wallet);
      }

      // Load team count
      const teamResponse = await fetch('/api/business/team');
      const teamData = await teamResponse.json();

      if (teamResponse.ok) {
        setTeamCount(teamData.members?.length || 0);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionType = (tx: any) => {
    if (!wallet) return 'unknown';
    return tx.to_address?.toLowerCase() === wallet.address?.toLowerCase() ? 'received' : 'sent';
  };

  // Calculate metrics
  const totalReceived = transactions
    .filter((tx) => getTransactionType(tx) === 'received' && tx.status === 'completed')
    .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

  const totalSent = transactions
    .filter((tx) => getTransactionType(tx) === 'sent' && tx.status === 'completed')
    .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

  const totalTransactions = transactions.length;
  const completedTransactions = transactions.filter((tx) => tx.status === 'completed').length;

  // Get recent transactions
  const recentTransactions = transactions
    .filter((tx) => tx.status === 'completed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Calculate monthly trend (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const last30DaysReceived = transactions
    .filter((tx) =>
      getTransactionType(tx) === 'received' &&
      tx.status === 'completed' &&
      new Date(tx.created_at) >= thirtyDaysAgo
    )
    .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

  const last30DaysSent = transactions
    .filter((tx) =>
      getTransactionType(tx) === 'sent' &&
      tx.status === 'completed' &&
      new Date(tx.created_at) >= thirtyDaysAgo
    )
    .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          View business insights and analytics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              ${totalReceived.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days: ${last30DaysReceived.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalSent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days: ${last30DaysSent.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(totalReceived - totalSent) >= 0 ? 'text-emerald-500' : 'text-red-600'}`}>
              {(totalReceived - totalSent) >= 0 ? '+' : ''}${(totalReceived - totalSent).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All-time balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active team members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Summary</CardTitle>
            <CardDescription>Overview of all transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Transactions</span>
              <span className="text-sm font-medium">{totalTransactions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Completed</span>
              <span className="text-sm font-medium text-emerald-500">{completedTransactions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending/Failed</span>
              <span className="text-sm font-medium text-orange-600">
                {totalTransactions - completedTransactions}
              </span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-muted-foreground">Success Rate</span>
              <span className="text-sm font-medium">
                {totalTransactions > 0
                  ? ((completedTransactions / totalTransactions) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest completed transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent transactions
              </p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => {
                  const isReceived = getTransactionType(tx) === 'received';
                  return (
                    <div key={tx.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {isReceived ? (
                          <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-orange-600" />
                        )}
                        <span className="text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={`font-medium ${isReceived ? 'text-emerald-500' : ''}`}>
                        {isReceived ? '+' : '-'}${parseFloat(tx.amount || '0').toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
