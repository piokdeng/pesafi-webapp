'use client'

/**
 * Custom Deposit Modal - Full UI Control
 * 
 * Multi-step deposit flow:
 * 1. Amount selection
 * 2. Payment method selection
 * 3. Processing
 * 4. Success/Error
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CreditCard, CheckCircle2, XCircle, ArrowLeft, DollarSign, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseAuthClient } from '@/lib/supabase-auth-client'
import KotaniPayDepositForm from './KotaniPayDepositForm'
import KotaniPayOption from './KotaniPayOption'

interface CustomDepositModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletAddress: string
  onDepositSuccess?: () => void
}

type DepositStep = 'amount' | 'method' | 'kotani-pay' | 'processing' | 'coinbase-widget' | 'success' | 'error'
type PaymentMethod = 'coinbase' | 'kotani-pay'

export default function CustomDepositModal({
  open,
  onOpenChange,
  walletAddress,
  onDepositSuccess
}: CustomDepositModalProps) {
  const [step, setStep] = useState<DepositStep>('amount')
  const [amount, setAmount] = useState('50')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null)

  const quickAmounts = ['10', '50', '100', '1000']

  const handleContinue = () => {
    if (!amount || parseFloat(amount) < 1) {
      toast.error('Minimum deposit is $1')
      return
    }
    setStep('method')
  }

  const handleMethodSelect = async (method: PaymentMethod) => {
    setPaymentMethod(method)

    if (method === 'kotani-pay') {
      setStep('kotani-pay')
    } else if (method === 'coinbase') {
      await processWithCoinbase()
    }
  }

  const processWithCoinbase = async () => {
    setStep('processing')

    try {
      const { data: { session } } = await supabaseAuthClient.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Please sign in to deposit funds')
      }

      const apiBaseUrl = window.location.origin
      const response = await fetch(`${apiBaseUrl}/api/coinbase/session-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          walletAddress: walletAddress,
          amount: parseFloat(amount),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create payment session')
      }

      const { sessionToken } = await response.json()
      const redirectUrl = encodeURIComponent(`${apiBaseUrl}/dashboard`)
      const partnerUserId = session.user.id
      
      // Create widget URL - Force USDC only on Base network
      const appId = process.env.NEXT_PUBLIC_COINBASE_PROJECT_ID || ''
      const widgetUrl = `https://pay.coinbase.com/buy/select-asset?sessionToken=${sessionToken}&appId=${appId}&defaultAsset=USDC&defaultNetwork=base&defaultPaymentMethod=CARD&fiatCurrency=USD&presetFiatAmount=${amount}&redirectUrl=${redirectUrl}&partnerUserId=${partnerUserId}`
      
      // Open Coinbase payment window
      const paymentWindow = window.open(widgetUrl, '_blank', 'width=500,height=700,scrollbars=yes,resizable=yes')
      
      if (!paymentWindow) {
        throw new Error('Please allow popups to complete payment')
      }
      
      // Store URL for reopen option and show waiting screen
      setWidgetUrl(widgetUrl)
      setStep('coinbase-widget')
    } catch (error) {
      console.error('Deposit error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Payment failed')
      setStep('error')
    }
  }

  const handleClose = () => {
    const wasSuccess = step === 'success'
    setStep('amount')
    setAmount('50')
    setPaymentMethod(null)
    setErrorMessage('')
    setWidgetUrl(null)
    onOpenChange(false)

    if (wasSuccess && onDepositSuccess) {
      onDepositSuccess()
    }
  }

  const handleBack = () => {
    if (step === 'method') setStep('amount')
    else if (step === 'kotani-pay') setStep('method')
    else if (step === 'coinbase-widget') {
      setWidgetUrl(null)
      setStep('method')
    }
    else if (step === 'error') setStep('method')
  }

  const handleWidgetComplete = () => {
    toast.info('If you completed the payment, your USD will arrive within a few minutes.')
    handleClose()
    if (onDepositSuccess) onDepositSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(step === 'method' || step === 'kotani-pay' || step === 'coinbase-widget' || step === 'error') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span>Deposit USD</span>
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Amount Selection */}
        {step === 'amount' && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-base">How much would you like to deposit?</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50"
                  min="1"
                  className="pl-10 text-2xl h-14 font-semibold"
                />
              </div>
              <p className="text-xs text-muted-foreground">Minimum: $1 USD</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Quick Select</Label>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amt) => (
                  <Button
                    key={amt}
                    variant={amount === amt ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAmount(amt)}
                    className="h-12"
                  >
                    ${amt}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleContinue}
              className="w-full h-12 text-base bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400"
              size="lg"
            >
              Continue
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secure payment powered by industry-leading providers
            </p>
          </div>
        )}

        {/* Step 2: Payment Method Selection */}
        {step === 'method' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Choose your payment method to deposit <span className="font-semibold">${amount}</span>
            </p>

            <div className="space-y-3">
              <KotaniPayOption
                type="deposit"
                onClick={() => handleMethodSelect('kotani-pay')}
              />

              <Card
                className="cursor-pointer hover:border-primary transition-all hover:shadow-md py-0 gap-0"
                onClick={() => handleMethodSelect('coinbase')}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-6 w-6 text-zinc-700" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">Card, Apple Pay & Coinbase</h4>
                    <p className="text-sm text-muted-foreground">Visa, Mastercard, Apple Pay via Coinbase</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <p className="text-xs text-center text-muted-foreground pt-2">
              All transactions are encrypted and secure
            </p>
          </div>
        )}

        {/* Kotani Pay Deposit Form */}
        {step === 'kotani-pay' && (
          <KotaniPayDepositForm
            walletAddress={walletAddress}
            amount={amount}
            onSuccess={() => {
              setStep('success')
              toast.success('Deposit initiated! We\'ll notify you when funds arrive.')
              if (onDepositSuccess) onDepositSuccess()
            }}
            onBack={handleBack}
          />
        )}

        {/* Step 2.6: Coinbase Payment Window */}
        {step === 'coinbase-widget' && widgetUrl && (
          <div className="space-y-6 py-6">
            <div className="bg-gradient-to-r from-green-50 to-zinc-50 p-6 rounded-lg border border-green-200">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-2xl">C</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-2">Complete Payment in Coinbase Window</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    A secure Coinbase payment window has been opened. Complete your ${amount} USD purchase there.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span>Waiting for payment...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <h5 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                What to do next:
              </h5>
              <ol className="space-y-2 text-sm text-muted-foreground ml-6">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">1.</span>
                  <span>Complete the payment in the Coinbase window</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">2.</span>
                  <span>USD will arrive in your wallet within 2-5 minutes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">3.</span>
                  <span>Click "Done" below once you've completed the payment</span>
                </li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => window.open(widgetUrl, '_blank', 'width=500,height=700')}
                variant="outline"
                className="flex-1"
              >
                Reopen Payment Window
              </Button>
              <Button
                onClick={handleWidgetComplete}
                className="flex-1 bg-green-600 hover:bg-green-500"
              >
                Done
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Don't see the payment window? Check if popups are blocked or click "Reopen Payment Window"
            </p>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 rounded-full bg-background" />
              </div>
            </div>
            <h3 className="text-lg font-semibold">Processing Payment</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Please wait while we securely process your ${amount} deposit...
            </p>
            <div className="flex gap-1 pt-4">
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-center">Payment Initiated!</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Your ${amount} deposit is being processed. USD will arrive in your wallet within a few minutes.
            </p>
            <div className="w-full pt-4 space-y-2">
              <Button
                onClick={handleClose}
                className="w-full bg-green-600 hover:bg-green-500"
              >
                Done
              </Button>
              <Button
                onClick={() => {
                  handleClose()
                  if (onDepositSuccess) onDepositSuccess()
                }}
                variant="outline"
                className="w-full"
              >
                View Balance
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Error */}
        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-center">Payment Failed</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {errorMessage || 'Something went wrong processing your payment. Please try again.'}
            </p>
            <div className="w-full pt-4 space-y-2">
              <Button
                onClick={() => setStep('method')}
                className="w-full"
              >
                Try Again
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
