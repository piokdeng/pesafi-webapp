'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, ArrowUpRight, ArrowDownLeft, Download, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

// Transaction display helpers
function truncateAddress(address: string | null | undefined): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getCategoryLabel(category: string | null | undefined): string {
  const labels: Record<string, string> = {
    kotani_pay: 'Kotani Pay', kotani: 'Kotani Pay', base: 'Base Network',
    coinbase: 'Coinbase', transak: 'Transak', flutterwave: 'Flutterwave', internal: 'KermaPay',
  };
  return labels[category || ''] || category || '';
}

function getBusinessTxLabel(tx: any, fallbackType: string): string {
  const meta = tx.metadata || {};
  const type = tx.type || (fallbackType === 'received' ? 'receive' : 'send');
  switch (type) {
    case 'send':
      return `Sent to ${truncateAddress(tx.to_address || meta.recipientAddress)}`;
    case 'receive':
      return `Received from ${truncateAddress(tx.from_address || meta.senderAddress)}`;
    case 'deposit': {
      const cat = getCategoryLabel(tx.category);
      return cat ? `Deposit via ${cat}` : 'Deposit';
    }
    case 'withdrawal': {
      const name = meta.accountName;
      const phone = meta.destination || meta.phoneNumber;
      if (name) return `Sent to ${name}`;
      if (phone) return `Sent to ${phone}`;
      return `Withdrawal to ${truncateAddress(tx.to_address)}`;
    }
    default:
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Transaction';
  }
}

function getBusinessTxIconStyle(tx: any, isIncoming: boolean) {
  const s = tx.status;
  if (s === 'failed' || s === 'refunded') return { bg: 'bg-red-100', icon: 'text-red-600' };
  if (s === 'pending') return { bg: 'bg-amber-100', icon: 'text-amber-600' };
  if (isIncoming) return { bg: 'bg-emerald-500/15', icon: 'text-emerald-500' };
  return { bg: 'bg-orange-100', icon: 'text-orange-600' };
}

function getBusinessTxAmountColor(tx: any, isIncoming: boolean): string {
  const s = tx.status;
  if (s === 'failed' || s === 'refunded') return 'text-red-600';
  if (isIncoming) return 'text-emerald-500';
  return 'text-foreground';
}

export default function BusinessTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/business/transactions?limit=100', {
        credentials: 'include' // Ensure cookies are sent
      });
      const data = await response.json();

      if (response.ok) {
        setTransactions(data.transactions || []);
        setWallet(data.wallet);
        setTotal(data.total || 0);
      } else {
        // Log errors for debugging but don't show toast for empty/new accounts
        console.error('Error loading transactions:', {
          status: response.status,
          error: data.error
        });
        // Only show error if it's a real server error, not auth or empty data
        if (response.status >= 500) {
          toast.error('Failed to load transactions');
        }
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionType = (tx: any) => {
    if (!wallet) return 'unknown';
    return tx.to_address?.toLowerCase() === wallet.address?.toLowerCase() ? 'received' : 'sent';
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      searchTerm === '' ||
      tx.hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.from_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.to_address?.toLowerCase().includes(searchTerm.toLowerCase());

    const txType = getTransactionType(tx);
    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'received' && txType === 'received') ||
      (filterType === 'sent' && txType === 'sent');

    return matchesSearch && matchesFilter;
  });

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Amount', 'From', 'To', 'Status', 'Hash'];
    const rows = filteredTransactions.map((tx) => [
      new Date(tx.created_at).toLocaleString(),
      getTransactionType(tx),
      tx.amount || '0',
      tx.from_address || '',
      tx.to_address || '',
      tx.status || 'pending',
      tx.hash || '',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Transactions exported successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your business transactions
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by address or hash..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {total} total transaction{total !== 1 ? 's' : ''}
            {filteredTransactions.length !== total &&
              ` (${filteredTransactions.length} filtered)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((tx) => {
                const type = getTransactionType(tx);
                const isReceived = type === 'received';
                const iconStyle = getBusinessTxIconStyle(tx, isReceived);

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedTransaction(tx)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${iconStyle.bg} ${iconStyle.icon}`}
                      >
                        {isReceived ? (
                          <ArrowDownLeft className="h-5 w-5" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {getBusinessTxLabel(tx, type)}
                          </p>
                          {tx.status && tx.status !== 'completed' && (
                            <Badge
                              variant={tx.status === 'failed' || tx.status === 'refunded' ? 'destructive' : 'secondary'}
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {tx.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p
                          className={`font-bold ${getBusinessTxAmountColor(tx, isReceived)}`}
                        >
                          {isReceived ? '+' : '-'}${parseFloat(tx.amount || '0').toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tx.currency || 'USD'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => { if (!open) setSelectedTransaction(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (() => {
            const tx = selectedTransaction;
            const meta = tx.metadata || {};
            const bType = getTransactionType(tx);
            const isIncoming = bType === 'received';
            const iconStyle = getBusinessTxIconStyle(tx, isIncoming);
            const statusVariant = (tx.status === 'failed' || tx.status === 'refunded') ? 'destructive' as const : tx.status === 'pending' ? 'secondary' as const : 'default' as const;
            const txHash = tx.tx_hash || tx.hash;

            const CopyBtn = ({ text }: { text: string }) => (
              <button onClick={() => { navigator.clipboard.writeText(text); toast.success('Copied!'); }} className="p-1 hover:bg-muted rounded">
                <Copy className="h-3 w-3 text-muted-foreground" />
              </button>
            );

            const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
              <div className="flex items-center justify-between text-sm py-1.5">
                <span className="text-muted-foreground">{label}</span>
                <div className="flex items-center gap-1.5 text-right">{children}</div>
              </div>
            );

            return (
              <div className="space-y-6">
                <div className="flex flex-col items-center text-center space-y-3 pt-2">
                  <div className={`p-4 rounded-full ${iconStyle.bg}`}>
                    {isIncoming ? <ArrowDownLeft className={`h-8 w-8 ${iconStyle.icon}`} /> : <ArrowUpRight className={`h-8 w-8 ${iconStyle.icon}`} />}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">{getBusinessTxLabel(tx, bType)}</p>
                  <p className={`text-3xl font-bold ${getBusinessTxAmountColor(tx, isIncoming)}`}>
                    {isIncoming ? '+' : '-'}${parseFloat(tx.amount || '0').toFixed(2)}
                  </p>
                  <Badge variant={statusVariant} className="capitalize">{tx.status || 'pending'}</Badge>
                </div>

                <div className="space-y-1 border-t pt-4">
                  <Row label="Status"><Badge variant={statusVariant} className="capitalize text-xs">{tx.status || 'pending'}</Badge></Row>
                  <Row label="Date & Time"><span className="font-medium">{new Date(tx.created_at).toLocaleString()}</span></Row>
                  <Row label="Type"><span className="font-medium capitalize">{tx.type || bType}</span></Row>
                  <Row label="Amount"><span className="font-medium">${parseFloat(tx.amount || '0').toFixed(2)} {tx.currency || 'USD'}</span></Row>
                  {tx.from_address && (
                    <Row label="From"><span className="font-medium font-mono text-xs">{truncateAddress(tx.from_address)}</span><CopyBtn text={tx.from_address} /></Row>
                  )}
                  {tx.to_address && (
                    <Row label="To"><span className="font-medium font-mono text-xs">{truncateAddress(tx.to_address)}</span><CopyBtn text={tx.to_address} /></Row>
                  )}
                  {meta.phoneNumber && (
                    <Row label="Phone"><span className="font-medium">{meta.phoneNumber}</span></Row>
                  )}
                  {tx.category && (
                    <Row label="Category"><span className="font-medium">{getCategoryLabel(tx.category)}</span></Row>
                  )}
                  {txHash && (
                    <Row label="Tx Hash">
                      <span className="font-medium font-mono text-xs">{truncateAddress(txHash)}</span>
                      <CopyBtn text={txHash} />
                      <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-muted rounded">
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    </Row>
                  )}
                  {tx.external_id && (
                    <Row label="Reference"><span className="font-medium text-xs">{tx.external_id}</span><CopyBtn text={tx.external_id} /></Row>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
