'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Send,
  QrCode,
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  Wallet,
  Copy,
  Check,
  RefreshCw,
  CreditCard,
  Wifi,
  Maximize2
} from 'lucide-react';
import { useSupabaseAuth, supabaseAuthClient } from '@/lib/supabase-auth-client';
import { WalletService } from '@/lib/web3/wallet-service';
import { CURRENCIES } from '@/lib/web3/config';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import CustomDepositModal from '@/components/wallet/CustomDepositModal';
import CustomWithdrawModal from '@/components/wallet/CustomWithdrawModal';
import QrScanner from '@/components/wallet/QrScanner';
import QRCode from 'react-qr-code';

export default function WalletDashboard() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const pathname = usePathname();
  const [wallet, setWallet] = useState<any>(null);
  const [balance, setBalance] = useState({ usdc: 0, eth: 0 });
  const [localCurrency, setLocalCurrency] = useState<string | null>(null); // Start with null to avoid default
  
  // Debug currency changes
  useEffect(() => {
    console.log('[WalletDashboard] Currency changed to:', localCurrency);
  }, [localCurrency]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [preferences, setPreferences] = useState({
    anonymizeAddress: false,
    anonymizeBalance: false,
    hideLocalAmount: false,
  });
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const preferencesLoadingRef = useRef(false);
  
  // Transaction states
  const [sendAmount, setSendAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [sending, setSending] = useState(false);
  
  // Modal states
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [qrFullscreenOpen, setQrFullscreenOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrSize, setQrSize] = useState(320);

  const walletService = new WalletService();

  // Calculate QR size based on window width
  useEffect(() => {
    const updateQrSize = () => {
      setQrSize(Math.min(window.innerWidth - 120, 320));
    };
    updateQrSize();
    window.addEventListener('resize', updateQrSize);
    return () => window.removeEventListener('resize', updateQrSize);
  }, []);

  useEffect(() => {
    if (!authLoading && user?.id) {
      // Check if session is corrupted (token too large)
      supabaseAuthClient.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token && session.access_token.length > 10000) {
          console.error('Corrupted session detected, clearing...');
          supabaseAuthClient.auth.signOut().then(() => {
            // Clear storage
            Object.keys(localStorage).forEach(key => {
              if (key.includes('supabase') || key.includes('clerk') || key.includes('sb-') || key.includes('auth')) {
                localStorage.removeItem(key);
              }
            });
            Object.keys(sessionStorage).forEach(key => {
              if (key.includes('supabase') || key.includes('clerk') || key.includes('sb-') || key.includes('auth')) {
                sessionStorage.removeItem(key);
              }
            });
            window.location.href = '/login?error=session-corrupted';
          });
          return;
        }

        // Load wallet and preferences when dashboard loads
        loadWallet();
        loadPreferences();
      });
    } else if (!authLoading && !user) {
      // User not authenticated, stop loading
      setLoading(false);
    }
  }, [user, authLoading]);

  // Reload preferences when navigating to dashboard (but not on initial load)
  useEffect(() => {
    if (pathname === '/dashboard' && user?.id && !authLoading) {
      loadPreferences();
    }
  }, [pathname, user, authLoading]);

  // Reload preferences when page becomes visible (user returns from settings)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user?.id && !authLoading) {
        loadPreferences();
      }
    };

    const handleFocus = () => {
      if (user?.id && !authLoading) {
        loadPreferences();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, authLoading]);

  const loadPreferences = async () => {
    // Prevent concurrent calls
    if (preferencesLoadingRef.current) {
      console.log('[WalletDashboard] Preferences already loading, skipping...');
      return;
    }
    
    try {
      console.log('[WalletDashboard] Loading preferences...');
      preferencesLoadingRef.current = true;
      setPreferencesLoading(true);
      const { data: { session } } = await supabaseAuthClient.auth.getSession();
      if (!session?.access_token) {
        return;
      }

      const response = await fetch('/api/user/preferences', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[WalletDashboard] Preferences loaded:', data);
        setPreferences({
          anonymizeAddress: data.anonymizeAddress || false,
          anonymizeBalance: data.hideUsdBalance || false,
          hideLocalAmount: data.hideLocalAmount || false,
        });
        // Load preferred currency from preferences
        if (data.currency) {
          console.log('[WalletDashboard] Setting currency to:', data.currency);
          setLocalCurrency(data.currency);
        } else {
          console.log('[WalletDashboard] No currency found, using default KES');
          setLocalCurrency('KES');
        }
      } else {
        console.log('[WalletDashboard] API failed, using default KES');
        // Fallback to default currency if API fails
        setLocalCurrency('KES');
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      // Fallback to default currency if loading fails
      setLocalCurrency('KES');
    } finally {
      preferencesLoadingRef.current = false;
      setPreferencesLoading(false);
    }
  };

  const anonymizeAddress = (address: string) => {
    if (!preferences.anonymizeAddress) return address;
    return `${address.substring(0, 6)}****...****${address.substring(address.length - 4)}`;
  };

  const anonymizeAmount = (amount: number | string) => {
    if (!preferences.anonymizeBalance) return amount;
    return '****';
  };

  const loadWallet = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get wallet
      let userWallet = await walletService.getWalletByUserId(user.id);
      
      // Auto-create if missing (silently in background)
      if (!userWallet) {
        console.log('No wallet found, creating one...');
        try {
          const newWallet = await walletService.createWallet(user.id);
          console.log('Wallet created:', newWallet);
          // Fetch the newly created wallet
          userWallet = await walletService.getWalletByUserId(user.id);
          if (!userWallet) {
            // If still no wallet, use the newWallet response directly
            userWallet = newWallet;
          }
        } catch (createError) {
          console.error('Error creating wallet:', createError);
          // Even if creation fails, continue and show empty state
          setLoading(false);
          return;
        }
      }

      if (userWallet) {
        setWallet(userWallet);
        // Use database balance (includes test deposits)
        setBalance({
          usdc: parseFloat(userWallet.usdc_balance || '0'),
          eth: parseFloat(userWallet.eth_balance || '0'),
        });
        // Currency is now managed by preferences, not wallet data
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      // Show user-friendly error for wallet creation issues
      if (error instanceof Error && error.message.includes('execution reverted')) {
        toast.error('Wallet creation temporarily unavailable. Please contact support.');
      }
      // Don't show error toast for other errors, just log it
    } finally {
      setLoading(false);
    }
  };

  const createWallet = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const newWallet = await walletService.createWallet(user.id);
      await loadWallet();
      toast.success('Wallet created successfully!');
    } catch (error) {
      console.error('Error creating wallet:', error);
      toast.error('Failed to create wallet');
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    if (!wallet || !user?.id) return;
    
    try {
      setRefreshing(true);
      
      // Get balance from database (includes test deposits)
      const apiBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/wallet/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${(await supabaseAuthClient.auth.getSession()).data.session?.access_token}`,
        },
      });
      
      if (response.ok) {
        const walletData = await response.json();
        setBalance({
          usdc: parseFloat(walletData.usdc_balance || '0'),
          eth: parseFloat(walletData.eth_balance || '0'),
        });
      } else {
        // Fallback to blockchain balance
        const newBalance = await walletService.getBalance(wallet.address);
        setBalance(newBalance);
      }
      
      toast.success('Balance updated');
    } catch (error) {
      console.error('Balance refresh error:', error);
      toast.error('Failed to refresh balance');
    } finally {
      setRefreshing(false);
    }
  };

  const copyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Address copied!');
    }
  };

  const handleQrScan = (scannedAddress: string) => {
    setRecipient(scannedAddress);
    toast.success('Recipient address scanned!');
  };

  const handleSend = async () => {
    if (!wallet || !sendAmount || !recipient) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      setSending(true);
      
      // Check if recipient is phone number or address
      let recipientAddress = recipient;
      if (recipient.startsWith('+') || /^\d+$/.test(recipient)) {
        // Look up wallet by phone
        const recipientWallet = await walletService.getWalletByPhone(recipient);
        if (!recipientWallet) {
          toast.error('Recipient not found');
          return;
        }
        recipientAddress = recipientWallet.address;
      }
      
      // ALWAYS use real blockchain transactions (test mode disabled)
      // Call API endpoint to send USDC (private key is decrypted server-side)
      const { data: { session } } = await supabaseAuthClient.auth.getSession();
      const apiBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

      const response = await fetch(`${apiBaseUrl}/api/wallet/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          toAddress: recipientAddress,
          amount: parseFloat(sendAmount),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transaction failed');
      }

      const result = await response.json();
      console.log('[Send] Transaction result:', result);

      toast.success(`Transaction sent! Hash: ${result.txHash.slice(0, 10)}...`);
      
      // Reset form
      setSendAmount('');
      setRecipient('');
      
      // Refresh balance
      await refreshBalance();
    } catch (error: any) {
      console.error('Send error:', error);
      toast.error(error.message || 'Transaction failed');
    } finally {
      setSending(false);
    }
  };

  const simulateTestSend = async (amount: number, recipientAddress: string) => {
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get auth headers
      const { data: { session } } = await supabaseAuthClient.auth.getSession();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      // Call API to simulate send
      const apiBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/wallet/test-send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount,
          recipientAddress,
          walletAddress: wallet.address,
          type: 'test_send'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`Test transaction sent! ${amount} USDC to ${recipientAddress.slice(0, 10)}...`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Test send failed');
      }
    } catch (error) {
      console.error('Test send error:', error);
      toast.error('Test send failed. Please try again.');
      throw error;
    }
  };

  const convertToLocal = (usdAmount: number) => {
    const currency = CURRENCIES[(localCurrency || 'KES') as keyof typeof CURRENCIES];
    return (usdAmount * currency.rate).toFixed(2);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-muted-foreground">Loading your account...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by layout
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-muted-foreground">Setting up your wallet...</p>
      </div>
    );
  }

  // If still no wallet after auto-create (should be very rare)
  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-muted-foreground">Initializing your wallet...</p>
        <Button 
          onClick={loadWallet} 
          variant="outline"
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card className="relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-700 text-white shadow-xl shadow-emerald-900/40">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -right-24 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-orange-400/15 blur-3xl" />
        </div>
        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold tracking-wide text-white/90">
              {(() => {
                const fullName = (user?.user_metadata?.name as string) || '';
                if (fullName) {
                  const parts = fullName.trim().split(/\s+/);
                  if (parts.length === 1) return parts[0];
                  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
                }
                if (user?.email) {
                  const base = user.email.split('@')[0];
                  return base.charAt(0).toUpperCase() + base.slice(1);
                }
                return 'KermaPay user';
              })()}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-white/80">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm font-semibold">KermaPay</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshBalance}
                disabled={refreshing}
                className="rounded-full"
                aria-label="Refresh balance"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            {/* Chip + contactless indicator */}
            <div className="flex items-center gap-3">
              <div className="relative h-8 w-12 rounded-md border border-white/30 bg-gradient-to-br from-white/25 to-white/10">
                <div className="absolute inset-y-1 left-2 right-2 grid grid-cols-3 gap-1 opacity-50">
                  <div className="border-l border-white/40" />
                  <div className="border-l border-white/40" />
                  <div className="border-l border-white/40" />
                </div>
              </div>
              <Wifi className="h-5 w-5 -rotate-90 text-white/40" aria-hidden />
            </div>

            {/* Amounts */}
            <div className="text-right ml-4 flex-1">
              <p className="text-4xl font-bold tracking-tight text-white">
                ${preferences.anonymizeBalance ? '****' : balance.usdc.toFixed(2)}
              </p>
              <p className="text-base text-white/70 mt-1">
                {preferencesLoading ? 'Loading...' : localCurrency} {preferences.hideLocalAmount ? '****' : convertToLocal(balance.usdc)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="h-24 flex-col gap-2 group transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 hover:border-primary/50 active:scale-95" variant="outline">
              <Send className="h-6 w-6 transition-transform group-hover:rotate-12 group-hover:scale-110" />
              <span className="font-medium">Send</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Money</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="recipient">Recipient (Phone/Address)</Label>
                <div className="flex gap-2">
                  <Input
                    id="recipient"
                    placeholder="+254712345678 or 0x..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setQrScannerOpen(true)}
                    title="Scan QR code"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ {localCurrency} {sendAmount ? convertToLocal(parseFloat(sendAmount)) : '0.00'}
                </p>
              </div>
              <Button 
                onClick={handleSend} 
                disabled={sending}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold"
              >
                {sending ? 'Sending...' : 'Send Money'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="h-24 flex-col gap-2 group transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 hover:border-primary/50 active:scale-95" variant="outline">
              <QrCode className="h-6 w-6 transition-transform group-hover:scale-110" />
              <span className="font-medium">Receive</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Receive Money</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="flex justify-center relative">
                <div className="relative">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCode
                      value={wallet?.address || ''}
                      size={192}
                      level="H"
                      className="w-48 h-48"
                    />
                  </div>
                  <Button
                    onClick={() => setQrFullscreenOpen(true)}
                    size="icon"
                    variant="outline"
                    className="absolute -top-2 -right-2 rounded-full bg-background shadow-lg"
                    title="Enlarge QR code"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Your Wallet Address</Label>
                <div className="flex gap-2">
                  <Input value={wallet?.address || ''} readOnly />
                  <Button onClick={copyAddress} size="icon" variant="outline">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {wallet?.phoneNumber && (
                <div className="space-y-2">
                  <Label>Your Phone Number</Label>
                  <Input value={wallet.phoneNumber} readOnly />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Fullscreen QR Code Modal */}
        <Dialog open={qrFullscreenOpen} onOpenChange={setQrFullscreenOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-center">Scan to Send Money</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4 py-6">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <QRCode
                  value={wallet?.address || ''}
                  size={qrSize}
                  level="H"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Share this QR code with others to receive payments to your wallet
              </p>
              <div className="space-y-2 w-full">
                <Label className="text-xs text-muted-foreground">Wallet Address</Label>
                <div className="flex gap-2">
                  <Input
                    value={wallet?.address || ''}
                    readOnly
                    className="text-xs font-mono"
                  />
                  <Button onClick={copyAddress} size="icon" variant="outline">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          className="h-24 flex-col gap-2 group transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20 hover:border-emerald-500/50 active:scale-95"
          variant="outline"
          onClick={() => setDepositModalOpen(true)}
        >
          <DollarSign className="h-6 w-6 transition-transform group-hover:scale-110 group-hover:text-emerald-500" />
          <span className="font-medium">Deposit</span>
        </Button>

        <Button
          className="h-24 flex-col gap-2 group transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 hover:border-orange-500/50 active:scale-95"
          variant="outline"
          onClick={() => setWithdrawModalOpen(true)}
        >
          <ArrowUpCircle className="h-6 w-6 transition-transform group-hover:-translate-y-1 group-hover:scale-110 group-hover:text-orange-500" />
          <span className="font-medium">Withdraw</span>
        </Button>
      </div>

      {/* Deposit Modal */}
      <CustomDepositModal 
        open={depositModalOpen}
        onOpenChange={setDepositModalOpen}
        walletAddress={wallet?.address || ''}
        onDepositSuccess={refreshBalance}
      />

      {/* Withdraw Modal */}
      <CustomWithdrawModal
        open={withdrawModalOpen}
        onOpenChange={setWithdrawModalOpen}
        balance={balance.usdc}
        walletAddress={wallet?.address || ''}
        onWithdrawSuccess={refreshBalance}
      />

      {/* QR Scanner Modal */}
      <QrScanner
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        onScan={handleQrScan}
      />

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ArrowDownCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No transactions yet</p>
            <p className="text-sm mt-1">Your transactions will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
