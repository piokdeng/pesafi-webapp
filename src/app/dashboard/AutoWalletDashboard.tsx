'use client'

/**
 * Auto Wallet Dashboard
 *
 * This dashboard automatically retrieves the user's wallet from the database
 * and allows deposit/withdraw WITHOUT requiring manual wallet connection.
 *
 * Perfect for users in developing countries who shouldn't need to understand
 * blockchain wallet connections.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import Link from 'next/link'
import { DollarSign, RefreshCw, ArrowDownLeft, ArrowUpRight, Wallet, Loader2, Send, QrCode, Copy, Check, CreditCard, Wifi, History, Smartphone, ArrowLeft, Users, ExternalLink, Banknote } from 'lucide-react'
import QRCode from 'react-qr-code'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import { useSupabaseAuth } from '@/lib/supabase-auth-client'
import { supabaseAuthClient } from '@/lib/supabase-auth-client'
import { useAutoWallet } from '@/hooks/useAutoWallet'
import { useContacts } from '@/hooks/useContacts'
import { useCurrencyConversion } from '@/hooks/useCurrencyConversion'
import CustomDepositModal from '@/components/wallet/CustomDepositModal'
import CustomWithdrawModal from '@/components/wallet/CustomWithdrawModal'
import ContactPicker from '@/components/wallet/ContactPicker'
import ContactsList from '@/components/wallet/ContactsList'
import TransactionFilter, { type TxFilters } from '@/components/wallet/TransactionFilter'
import { detectCurrencyFromPhone, detectCountryFromPhone, getDefaultProviderForCountry, validateMobileMoneyCombo, getMinimumLocalAmount } from '@/lib/mobile-money-validation'

function QrScannerView({ onScan }: { onScan: (address: string) => void }) {
  const [error, setError] = useState<string | null>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    const html5Qrcode = new Html5Qrcode('qr-reader')
    let stopped = false

    html5Qrcode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const text = decodedText.trim()
          if (/^0x[a-fA-F0-9]{40}$/.test(text)) {
            stopped = true
            html5Qrcode.stop().catch(() => {})
            onScanRef.current(text)
          }
        },
        () => {} // ignore scan failures
      )
      .catch((err: unknown) => {
        setError('Could not access camera. Please allow camera permissions.')
        console.error('QR scanner error:', err)
      })

    return () => {
      if (!stopped) {
        html5Qrcode.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm text-muted-foreground">
        Point your camera at a wallet QR code
      </p>
      {error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm text-center">
          {error}
        </div>
      ) : (
        <div id="qr-reader" className="rounded-lg overflow-hidden" />
      )}
    </div>
  )
}

// Transaction display helpers
function truncateAddress(address: string | null | undefined): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getCategoryLabel(category: string | null | undefined): string {
  const labels: Record<string, string> = {
    kotani_pay: 'Kotani Pay', kotani: 'Kotani Pay', base: 'Base Network',
    coinbase: 'Coinbase', transak: 'Transak', flutterwave: 'Flutterwave', internal: 'KermaPay',
  }
  return labels[category || ''] || category || ''
}

function resolveContactName(contacts: any[], address?: string | null, phone?: string | null): string | null {
  if (!contacts.length) return null
  if (address) {
    const match = contacts.find((c: any) => c.wallet_address?.toLowerCase() === address.toLowerCase())
    if (match) return match.name
  }
  if (phone) {
    const match = contacts.find((c: any) => c.phone_number === phone)
    if (match) return match.name
  }
  return null
}

function getTransactionLabel(tx: any, contacts: any[] = []): string {
  const meta = tx.metadata || {}
  switch (tx.type) {
    case 'send': {
      const addr = tx.to_address || meta.recipientAddress
      const name = resolveContactName(contacts, addr, null)
      return `Sent to ${name || truncateAddress(addr)}`
    }
    case 'receive': {
      const addr = tx.from_address || meta.senderAddress
      const name = resolveContactName(contacts, addr, null)
      return `Received from ${name || truncateAddress(addr)}`
    }
    case 'deposit': {
      const cat = getCategoryLabel(tx.category)
      return cat ? `Deposit via ${cat}` : 'Deposit'
    }
    case 'withdrawal': {
      const phone = meta.destination || meta.phoneNumber
      const name = meta.accountName || resolveContactName(contacts, tx.to_address, phone)
      if (name) return `Sent to ${name}`
      if (phone) return `Sent to ${phone}`
      return `Withdrawal to ${truncateAddress(tx.to_address)}`
    }
    default:
      return tx.type ? tx.type.charAt(0).toUpperCase() + tx.type.slice(1) : 'Transaction'
  }
}

function getTxIconStyle(tx: any) {
  const s = tx.status
  const isIncoming = tx.type === 'receive' || tx.type === 'deposit'
  if (s === 'failed' || s === 'refunded') return { bg: 'bg-red-100', icon: 'text-red-600' }
  if (s === 'pending') return { bg: 'bg-amber-100', icon: 'text-amber-600' }
  if (isIncoming) return { bg: 'bg-emerald-500/15', icon: 'text-emerald-400' }
  return { bg: 'bg-orange-100', icon: 'text-orange-600' }
}

function getTxAmountColor(tx: any): string {
  const s = tx.status
  if (s === 'failed' || s === 'refunded') return 'text-red-600'
  if (tx.type === 'receive' || tx.type === 'deposit') return 'text-emerald-400'
  return 'text-foreground'
}

export default function AutoWalletDashboard({ walletType }: { walletType?: string } = {}) {
  const { user } = useSupabaseAuth()
  const { walletAddress, balance, isLoading, refreshBalance } = useAutoWallet(walletType)
  const {
    contacts, recentContacts,
    addContact, updateContact, deleteContact, toggleFavorite, fetchContacts,
  } = useContacts()

  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [showContacts, setShowContacts] = useState(false)
  const [txFilters, setTxFilters] = useState<TxFilters>({ type: null, search: '' })
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [sendAmount, setSendAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [addressCopied, setAddressCopied] = useState(false)
  const [sendCurrency, setSendCurrency] = useState<'USD' | 'LOCAL'>('USD')
  const [refreshing, setRefreshing] = useState(false)
  const [sendMode, setSendMode] = useState<'choose' | 'wallet' | 'mobile' | 'scanqr'>('choose')
  const [mobileProvider, setMobileProvider] = useState('MPESA')
  const [mobilePhone, setMobilePhone] = useState('')
  const [mobileAccountName, setMobileAccountName] = useState('')
  const [mobileCurrency, setMobileCurrency] = useState('KES')
  const [mobileSending, setMobileSending] = useState(false)
  const [mobileSent, setMobileSent] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [loadingTxs, setLoadingTxs] = useState(false)
  const [preferredCurrency, setPreferredCurrency] = useState('KES')
  const [preferences, setPreferences] = useState({
    hideUsdBalance: false,
    hideLocalAmount: false,
    anonymizeAddress: false,
    showBalance: true,
    showActivity: true,
  })
  const [preferencesLoading, setPreferencesLoading] = useState(true)

  // Fetch user preferences (currency and privacy settings)
  const fetchPreferences = async () => {
    try {
      const { data: { session } } = await supabaseAuthClient.auth.getSession()
      if (!session?.access_token) {
        return // Skip if no valid session
      }

      const response = await fetch('/api/user/preferences', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        if (data) {
          if (data.currency) {
            setPreferredCurrency(data.currency)
          }
          setPreferences({
            hideUsdBalance: data.hideUsdBalance || false,
            hideLocalAmount: data.hideLocalAmount || false,
            anonymizeAddress: data.anonymizeAddress || false,
            showBalance: data.showBalance !== false, // Default to true
            showActivity: data.showActivity !== false, // Default to true
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
    } finally {
      setPreferencesLoading(false)
    }
  }

  const userId = user?.id
  useEffect(() => {
    // Only fetch preferences when user is authenticated
    if (!userId) {
      setPreferencesLoading(false)
      return
    }

    fetchPreferences()

    // Listen for preference updates (from settings page)
    const handlePreferenceUpdate = () => {
      fetchPreferences()
    }

    window.addEventListener('preferencesUpdated', handlePreferenceUpdate)

    // Also refetch when page becomes visible (user returns from settings)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchPreferences()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('preferencesUpdated', handlePreferenceUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId])

  // Use currency conversion hook
  const { formatLocalAmount, convertToLocalCurrency } = useCurrencyConversion(preferredCurrency)


  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await refreshBalance()
      toast.success('Balance refreshed!')
    } catch (error) {
      console.error('Error refreshing balance:', error)
      toast.error('Failed to refresh balance')
    } finally {
      setRefreshing(false)
    }
  }

  const handleSend = async () => {
    if (!sendAmount || !recipient) {
      toast.error('Please fill all fields')
      return
    }

    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      toast.error('Invalid recipient address')
      return
    }

    if (recipient.toLowerCase() === walletAddress?.toLowerCase()) {
      toast.error('You cannot send to your own wallet')
      return
    }

    if (parseFloat(sendAmount) > balance) {
      toast.error('Insufficient balance')
      return
    }

    if (!walletAddress) {
      toast.error('No wallet found. Please refresh the page.')
      return
    }

    const amount = parseFloat(sendAmount)
    const recipientAddr = recipient

    // Optimistic update - add transaction immediately to UI
    const optimisticTx = {
      id: `temp_${Date.now()}`,
      type: 'send',
      amount: amount.toString(),
      created_at: new Date().toISOString(),
      status: 'pending',
      metadata: { recipientAddress: recipientAddr }
    }
    setTransactions(prev => [optimisticTx, ...prev])

    // Close modal and clear form immediately for snappy UX
    setSendModalOpen(false)
    const tempAmount = sendAmount
    const tempRecipient = recipient
    setSendAmount('')
    setRecipient('')

    try {
      const { data: { session } } = await supabaseAuthClient.auth.getSession()
      if (!session?.access_token) {
        // Rollback optimistic update
        setTransactions(prev => prev.filter(tx => tx.id !== optimisticTx.id))
        toast.error('Please sign in first')
        return
      }

      // Send request (real on-chain transaction)
      const response = await fetch('/api/wallet/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount,
          recipientAddress: recipientAddr,
          ...(walletType && { walletType }),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Rollback optimistic update
        setTransactions(prev => prev.filter(tx => tx.id !== optimisticTx.id))
        throw new Error(errorData.error || 'Failed to send transaction')
      }

      await response.json()

      // Show success toast
      toast.success(`Sent $${tempAmount} USD!`, { duration: 2000 })

      // Refresh in background (don't await - keeps UI fast)
      refreshBalance().then(() => {
        // Replace optimistic transaction with real one from server
        fetchTransactions()
      })
    } catch (error: any) {
      console.error('Send error:', error)
      // Rollback optimistic update
      setTransactions(prev => prev.filter(tx => tx.id !== optimisticTx.id))
      toast.error(error.message || 'Transaction failed')
      // Restore form values on error
      setSendAmount(tempAmount)
      setRecipient(tempRecipient)
      setSendModalOpen(true)
    }
  }

  const handleSendMobile = async () => {
    if (!sendAmount || !mobilePhone || !mobileAccountName) {
      toast.error('Please fill all fields')
      return
    }

    // Auto-correct currency from phone number before validation
    const detectedCurrency = detectCurrencyFromPhone(mobilePhone)
    const effectiveCurrency = detectedCurrency || mobileCurrency
    if (detectedCurrency && detectedCurrency !== mobileCurrency) {
      setMobileCurrency(detectedCurrency)
    }

    // Auto-correct provider from phone number
    const detectedCountry = detectCountryFromPhone(mobilePhone)
    const effectiveProvider = detectedCountry
      ? getDefaultProviderForCountry(detectedCountry)
      : mobileProvider
    if (effectiveProvider !== mobileProvider) {
      setMobileProvider(effectiveProvider)
    }

    // Validate phone/provider/currency combo
    const validation = validateMobileMoneyCombo(mobilePhone, effectiveProvider, effectiveCurrency)
    if (!validation.valid) {
      toast.error(validation.error!)
      return
    }

    // Check minimum amount (100 in local currency)
    const minLocal = getMinimumLocalAmount(effectiveCurrency)
    const localAmount = sendCurrency === 'LOCAL'
      ? parseFloat(sendAmount)
      : convertToLocalCurrency(parseFloat(sendAmount))
    if (localAmount < minLocal) {
      toast.error(`Minimum amount is ${minLocal} ${effectiveCurrency}`)
      return
    }

    const usdAmount = sendCurrency === 'USD'
      ? parseFloat(sendAmount)
      : parseFloat(sendAmount) / convertToLocalCurrency(1)

    if (usdAmount > balance) {
      toast.error('Insufficient balance')
      return
    }

    setMobileSending(true)

    try {
      const { data: { session } } = await supabaseAuthClient.auth.getSession()
      if (!session?.access_token) {
        toast.error('Please sign in first')
        return
      }

      const response = await fetch('/api/kotani-pay/offramp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: usdAmount,
          currency: effectiveCurrency,
          chain: 'BASE',
          token: 'USDC',
          withdrawalMethod: 'mobile_money',
          mobileMoneyDetails: {
            phoneNumber: mobilePhone,
            accountName: mobileAccountName,
            networkProvider: mobileProvider,
          },
          ...(walletType && { walletType }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send to mobile money')
      }

      setMobileSent(true)
      const localAmount = sendCurrency === 'USD' ? formatLocalAmount(parseFloat(sendAmount)) : `${mobileCurrency} ${parseFloat(sendAmount).toLocaleString()}`
      toast.success(`Sent ${localAmount} to ${mobileAccountName} via ${mobileProvider}`)
      refreshBalance()
      fetchTransactions()
    } catch (error: any) {
      console.error('Mobile money send error:', error)
      toast.error(error.message || 'Failed to send to mobile money')
    } finally {
      setMobileSending(false)
    }
  }

  // Helper: set phone and auto-detect currency + provider
  const setMobilePhoneWithDetection = (phone: string) => {
    setMobilePhone(phone)
    const currency = detectCurrencyFromPhone(phone)
    if (currency) setMobileCurrency(currency)
    const country = detectCountryFromPhone(phone)
    if (country) setMobileProvider(getDefaultProviderForCountry(country))
  }

  const resetSendModal = () => {
    setSendMode('choose')
    setSendAmount('')
    setRecipient('')
    setMobilePhone('')
    setMobileAccountName('')
    setMobileProvider('MPESA')
    setMobileCurrency('KES')
    setMobileSent(false)
    setSendCurrency('USD')
  }

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setAddressCopied(true)
      toast.success('Address copied!')
      setTimeout(() => setAddressCopied(false), 2000)
    }
  }

  const fetchTransactions = useCallback(async (filters?: TxFilters) => {
    if (!userId) return

    setLoadingTxs(true)
    try {
      const { data: { session } } = await supabaseAuthClient.auth.getSession()
      const params = new URLSearchParams()
      const f = filters || txFilters
      if (f.type) params.set('type', f.type)
      if (f.search) params.set('search', f.search)
      if (walletType) params.set('walletType', walletType)

      const hasFilters = f.type || f.search
      if (!hasFilters) params.set('limit', '5')

      const response = await fetch(`/api/transactions/${userId}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTransactions(hasFilters ? data : data.slice(0, 5))
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoadingTxs(false)
    }
  }, [userId, txFilters])

  // Auto-load transactions on mount
  useEffect(() => {
    if (userId && walletAddress) {
      fetchTransactions()
    }
  }, [userId, walletAddress])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Loading your wallet...</p>
        </div>
      </div>
    )
  }

  if (!walletAddress) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Setting up your account...</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Please wait while we set up your account. This will only take a moment.
              </p>
              <p className="text-xs text-muted-foreground">
                If this continues for more than a few seconds, please refresh the page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Balance Card - Gradient Design */}
      {preferences.showBalance && (
      <Card className="relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-700 text-white shadow-xl shadow-emerald-900/40">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -right-24 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-orange-400/15 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
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
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-full"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-8 w-12 rounded-md border border-white/30 bg-gradient-to-br from-white/20 to-white/10">
                <div className="absolute inset-y-1 left-2 right-2 grid grid-cols-3 gap-1 opacity-50">
                  <div className="border-l border-white/40" />
                  <div className="border-l border-white/40" />
                  <div className="border-l border-white/40" />
                </div>
              </div>
              <Wifi className="h-5 w-5 -rotate-90 text-white/40" />
            </div>
            <div className="text-right ml-4 flex-1">
              <p className="text-4xl font-bold tracking-tight text-white">
                {preferences.hideUsdBalance ? '$****' : `$${balance.toFixed(2)}`}
              </p>
              <p className="text-base text-white/70 mt-1">
                {preferences.hideLocalAmount ? `${preferredCurrency} ****` : `≈ ${formatLocalAmount(balance)}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Button
          asChild
          className="h-24 flex-col gap-2 bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white border-0 shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 transition-all"
          variant="outline"
        >
          <Link href="/dashboard/fx">
            <Banknote className="h-6 w-6" />
            <span className="font-medium">FX (SSP)</span>
          </Link>
        </Button>
        <Dialog open={sendModalOpen} onOpenChange={(open) => {
          setSendModalOpen(open)
          if (!open) resetSendModal()
        }}>
          <DialogTrigger asChild>
            <Button className="h-24 flex-col gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white border-0 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all" variant="outline">
              <Send className="h-6 w-6" />
              <span className="font-medium">Send</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {sendMode !== 'choose' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      if (mobileSent) {
                        resetSendModal()
                      } else {
                        setSendMode('choose')
                      }
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <span>Send USD</span>
              </DialogTitle>
            </DialogHeader>

            {/* Chooser: To Wallet or To Mobile Money */}
            {sendMode === 'choose' && (
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  How would you like to send?
                </p>
                <div className="grid gap-3">
                  <button
                    className="flex items-center gap-4 p-4 rounded-lg border hover:border-blue-500 hover:bg-blue-500/10 transition-all text-left"
                    onClick={() => setSendMode('wallet')}
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Wallet className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">To Wallet Address</h4>
                      <p className="text-sm text-muted-foreground">Send USDC to any wallet</p>
                    </div>
                  </button>
                  <button
                    className="flex items-center gap-4 p-4 rounded-lg border hover:border-emerald-500 hover:bg-emerald-500/10 transition-all text-left"
                    onClick={() => setSendMode('mobile')}
                  >
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold">To Mobile Money</h4>
                      <p className="text-sm text-muted-foreground">M-Pesa, MTN, Airtel</p>
                    </div>
                  </button>
                  <button
                    className="flex items-center gap-4 p-4 rounded-lg border hover:border-amber-500 hover:bg-amber-50 transition-all text-left"
                    onClick={() => setSendMode('scanqr')}
                  >
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                      <QrCode className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Scan QR Code</h4>
                      <p className="text-sm text-muted-foreground">Scan a wallet address</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* To Wallet Address form */}
            {sendMode === 'wallet' && (
              <div className="space-y-4 mt-4">
                <ContactPicker
                  mode="wallet"
                  contacts={contacts}
                  onSelectContact={(c) => {
                    if (c.wallet_address) setRecipient(c.wallet_address)
                  }}
                />
                <div className="space-y-2">
                  <Label>Recipient Address</Label>
                  <Input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..."
                  />
                </div>

                {/* Currency Toggle */}
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={sendCurrency === 'USD' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setSendCurrency('USD')}
                    >
                      USD
                    </Button>
                    <Button
                      type="button"
                      variant={sendCurrency === 'LOCAL' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setSendCurrency('LOCAL')}
                    >
                      {preferredCurrency}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Amount ({sendCurrency === 'USD' ? 'USD' : preferredCurrency})</Label>
                  <Input
                    type="number"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Available: {sendCurrency === 'USD'
                        ? `$${balance.toFixed(2)} USD`
                        : formatLocalAmount(balance)
                      }
                    </p>
                    {sendAmount && parseFloat(sendAmount) > 0 && (
                      <p className="text-xs text-emerald-400 font-medium">
                        {sendCurrency === 'USD'
                          ? `≈ ${formatLocalAmount(parseFloat(sendAmount))}`
                          : `≈ $${(parseFloat(sendAmount) / convertToLocalCurrency(1)).toFixed(2)} USD`
                        }
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleSend}
                  disabled={!sendAmount || parseFloat(sendAmount) <= 0 || parseFloat(sendAmount) > balance}
                  className={`w-full ${
                    sendAmount && parseFloat(sendAmount) > 0 && parseFloat(sendAmount) <= balance
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-md'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send USD
                </Button>
              </div>
            )}

            {/* To Mobile Money form */}
            {sendMode === 'mobile' && !mobileSent && (
              <div className="space-y-4 mt-4">
                <ContactPicker
                  mode="mobile"
                  contacts={contacts}
                  onSelectContact={(c) => {
                    if (c.phone_number) setMobilePhoneWithDetection(c.phone_number)
                    if (c.name && c.source !== 'transaction') setMobileAccountName(c.name)
                  }}
                />
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    value={mobilePhone}
                    onChange={(e) => setMobilePhoneWithDetection(e.target.value)}
                    placeholder="+254712345678"
                  />
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +254 for Kenya). Currency and provider auto-detect.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Mobile Money Provider</Label>
                  <select
                    value={mobileProvider}
                    onChange={(e) => setMobileProvider(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="MPESA">M-Pesa (Kenya, Tanzania)</option>
                    <option value="MTN">MTN Mobile Money (Ghana, Uganda, South Sudan)</option>
                    <option value="AIRTEL">Airtel Money (Uganda, Tanzania)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Recipient Name</Label>
                  <Input
                    type="text"
                    value={mobileAccountName}
                    onChange={(e) => setMobileAccountName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                {/* Currency Toggle */}
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={sendCurrency === 'USD' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setSendCurrency('USD')}
                    >
                      USD
                    </Button>
                    <Button
                      type="button"
                      variant={sendCurrency === 'LOCAL' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setSendCurrency('LOCAL')}
                    >
                      {mobileCurrency}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Amount ({sendCurrency === 'USD' ? 'USD' : mobileCurrency})</Label>
                  <Input
                    type="number"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Available: {sendCurrency === 'USD'
                        ? `$${balance.toFixed(2)} USD`
                        : formatLocalAmount(balance)
                      }
                    </p>
                    {sendAmount && parseFloat(sendAmount) > 0 && (
                      <p className="text-xs text-emerald-400 font-medium">
                        {sendCurrency === 'USD'
                          ? `≈ ${formatLocalAmount(parseFloat(sendAmount))}`
                          : `≈ $${(parseFloat(sendAmount) / convertToLocalCurrency(1)).toFixed(2)} USD`
                        }
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSendMobile}
                  disabled={mobileSending || !sendAmount || parseFloat(sendAmount) <= 0 || !mobilePhone || !mobileAccountName}
                  className={`w-full ${
                    sendAmount && parseFloat(sendAmount) > 0 && mobilePhone && mobileAccountName
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-md'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {mobileSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Smartphone className="h-4 w-4 mr-2" />
                      Send to Mobile Money
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Mobile Money success */}
            {sendMode === 'mobile' && mobileSent && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <Check className="h-10 w-10 text-emerald-400" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-semibold">Sent!</h3>
                  <p className="text-sm text-muted-foreground">
                    {mobileAccountName} will receive {sendCurrency === 'USD' ? formatLocalAmount(parseFloat(sendAmount)) : `${mobileCurrency} ${parseFloat(sendAmount).toLocaleString()}`} via {mobileProvider}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    resetSendModal()
                    setSendModalOpen(false)
                  }}
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            )}

            {/* QR Code Scanner */}
            {sendMode === 'scanqr' && (
              <QrScannerView
                onScan={(address) => {
                  setRecipient(address)
                  setSendMode('wallet')
                  toast.success('Wallet address scanned!')
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={receiveModalOpen} onOpenChange={setReceiveModalOpen}>
          <DialogTrigger asChild>
            <Button className="h-24 flex-col gap-2 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white border-0 shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 transition-all" variant="outline">
              <QrCode className="h-6 w-6" />
              <span className="font-medium">Receive</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Receive USD</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Share this address to receive USD on Base network
              </p>
              <div className="flex justify-center py-2">
                <div className="bg-white p-3 rounded-lg">
                  <QRCode value={walletAddress || ''} size={180} />
                </div>
              </div>
              <div className="p-4 bg-secondary rounded-lg break-all font-mono text-sm">
                {preferences.anonymizeAddress
                  ? `${walletAddress?.slice(0, 6)}****...****${walletAddress?.slice(-4)}`
                  : walletAddress
                }
              </div>
              <Button
                onClick={copyAddress}
                className="w-full"
                variant="outline"
              >
                {addressCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Address
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          className="h-24 flex-col gap-2 bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white border-0 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
          variant="outline"
          onClick={() => setDepositModalOpen(true)}
        >
          <ArrowDownLeft className="h-6 w-6" />
          <span className="font-medium">Deposit</span>
        </Button>

        <Button
          className="h-24 flex-col gap-2 bg-gradient-to-br from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white border-0 shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all"
          variant="outline"
          onClick={() => setWithdrawModalOpen(true)}
        >
          <ArrowUpRight className="h-6 w-6" />
          <span className="font-medium">Withdraw</span>
        </Button>
      </div>

      {/* Custom Deposit Modal */}
      <CustomDepositModal
        open={depositModalOpen}
        onOpenChange={setDepositModalOpen}
        walletAddress={walletAddress || ''}
        onDepositSuccess={refreshBalance}
      />

      {/* Custom Withdraw Modal */}
      <CustomWithdrawModal
        open={withdrawModalOpen}
        onOpenChange={setWithdrawModalOpen}
        walletAddress={walletAddress || ''}
        balance={balance}
        onWithdrawSuccess={refreshBalance}
      />

      {/* Contacts Preview */}
      {recentContacts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Quick Send
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowContacts(true)}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {recentContacts.slice(0, 3).map(contact => (
                <button
                  key={contact.id}
                  onClick={() => {
                    if (contact.wallet_address) {
                      setRecipient(contact.wallet_address)
                      setSendMode('wallet')
                      setSendModalOpen(true)
                    } else if (contact.phone_number) {
                      setMobilePhoneWithDetection(contact.phone_number)
                      if (contact.name && contact.source !== 'transaction') {
                        setMobileAccountName(contact.name)
                      }
                      setSendMode('mobile')
                      setSendModalOpen(true)
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-full border hover:bg-muted/70 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                    {contact.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium truncate max-w-[100px]">{contact.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Contacts Dialog */}
      <ContactsList
        open={showContacts}
        onOpenChange={setShowContacts}
        contacts={contacts}
        onAdd={addContact}
        onUpdate={updateContact}
        onDelete={deleteContact}
        onToggleFavorite={toggleFavorite}
        onSendTo={(contact) => {
          setShowContacts(false)
          if (contact.wallet_address) {
            setRecipient(contact.wallet_address)
            setSendMode('wallet')
            setSendModalOpen(true)
          } else if (contact.phone_number) {
            setMobilePhoneWithDetection(contact.phone_number)
            if (contact.name && contact.source !== 'transaction') {
              setMobileAccountName(contact.name)
            }
            setSendMode('mobile')
            setSendModalOpen(true)
          }
        }}
      />

      {/* Transaction History */}
      {preferences.showActivity && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => fetchTransactions()}>
              <RefreshCw className={`h-4 w-4 ${loadingTxs ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <TransactionFilter onFilterChange={(filters) => {
            setTxFilters(filters)
            fetchTransactions(filters)
          }} />
        </CardHeader>
        <CardContent>
          {loadingTxs ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No transactions yet</p>
              <p className="text-sm mt-1">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, index) => {
                const iconStyle = getTxIconStyle(tx)
                const isIncoming = tx.type === 'receive' || tx.type === 'deposit'
                return (
                  <div
                    key={tx.id || index}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedTransaction(tx)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${iconStyle.bg}`}>
                        {isIncoming ? (
                          <ArrowDownLeft className={`h-4 w-4 ${iconStyle.icon}`} />
                        ) : (
                          <ArrowUpRight className={`h-4 w-4 ${iconStyle.icon}`} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{getTransactionLabel(tx, contacts)}</p>
                          {tx.status && tx.status !== 'completed' && (
                            <Badge variant={tx.status === 'failed' || tx.status === 'refunded' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0 h-4">
                              {tx.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${getTxAmountColor(tx)}`}>
                        {isIncoming ? '+' : '-'}
                        {preferences.hideUsdBalance ? '$****' : `$${parseFloat(tx.amount).toFixed(2)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {preferences.hideLocalAmount
                          ? `${preferredCurrency} ****`
                          : `≈ ${formatLocalAmount(parseFloat(tx.amount))}`
                        }
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => { if (!open) setSelectedTransaction(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (() => {
            const tx = selectedTransaction
            const meta = tx.metadata || {}
            const isIncoming = tx.type === 'receive' || tx.type === 'deposit'
            const iconStyle = getTxIconStyle(tx)
            const statusVariant = (tx.status === 'failed' || tx.status === 'refunded') ? 'destructive' as const : tx.status === 'pending' ? 'secondary' as const : 'default' as const
            const txHash = tx.tx_hash || tx.hash

            const CopyBtn = ({ text }: { text: string }) => (
              <button onClick={() => { navigator.clipboard.writeText(text); toast.success('Copied!') }} className="p-1 hover:bg-muted rounded">
                <Copy className="h-3 w-3 text-muted-foreground" />
              </button>
            )

            const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
              <div className="flex items-center justify-between text-sm py-1.5">
                <span className="text-muted-foreground">{label}</span>
                <div className="flex items-center gap-1.5 text-right">{children}</div>
              </div>
            )

            return (
              <div className="space-y-6">
                <div className="flex flex-col items-center text-center space-y-3 pt-2">
                  <div className={`p-4 rounded-full ${iconStyle.bg}`}>
                    {isIncoming ? <ArrowDownLeft className={`h-8 w-8 ${iconStyle.icon}`} /> : <ArrowUpRight className={`h-8 w-8 ${iconStyle.icon}`} />}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">{getTransactionLabel(tx, contacts)}</p>
                  <p className={`text-3xl font-bold ${getTxAmountColor(tx)}`}>
                    {isIncoming ? '+' : '-'}{preferences.hideUsdBalance ? '$****' : `$${parseFloat(tx.amount).toFixed(2)}`}
                  </p>
                  {!preferences.hideLocalAmount && (
                    <p className="text-sm text-muted-foreground">≈ {formatLocalAmount(parseFloat(tx.amount))}</p>
                  )}
                  <Badge variant={statusVariant} className="capitalize">{tx.status || 'pending'}</Badge>
                </div>

                <div className="space-y-1 border-t pt-4">
                  <Row label="Status"><Badge variant={statusVariant} className="capitalize text-xs">{tx.status || 'pending'}</Badge></Row>
                  <Row label="Date & Time"><span className="font-medium">{new Date(tx.created_at).toLocaleString()}</span></Row>
                  <Row label="Type"><span className="font-medium capitalize">{tx.type}</span></Row>
                  <Row label="Amount"><span className="font-medium">${parseFloat(tx.amount).toFixed(2)} USD</span></Row>
                  {!preferences.hideLocalAmount && (
                    <Row label="Local Amount"><span className="font-medium">{formatLocalAmount(parseFloat(tx.amount))}</span></Row>
                  )}
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
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
