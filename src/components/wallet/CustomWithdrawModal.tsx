'use client'

/**
 * Custom Withdraw Modal - Full UI Control
 * 
 * Multi-step withdraw flow:
 * 1. Amount selection
 * 2. Bank account details (or Coinbase)
 * 3. Processing
 * 4. Success/Error
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Building2, CheckCircle2, XCircle, ArrowLeft, DollarSign, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseAuthClient } from '@/lib/supabase-auth-client'
import BankAccountForm from './BankAccountForm'
import KotaniPayWithdrawForm from './KotaniPayWithdrawForm'
import KotaniPayOption from './KotaniPayOption'

interface CustomWithdrawModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletAddress: string
  balance: number
  onWithdrawSuccess?: () => void
}

type WithdrawStep = 'amount' | 'method' | 'bank' | 'kotani-pay' | 'processing' | 'coinbase-widget' | 'success' | 'error'
type WithdrawMethod = 'bank' | 'coinbase' | 'kotani-pay'

export default function CustomWithdrawModal({
  open,
  onOpenChange,
  walletAddress,
  balance,
  onWithdrawSuccess
}: CustomWithdrawModalProps) {
  const [step, setStep] = useState<WithdrawStep>('amount')
  const [amount, setAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawMethod | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null)

  const quickAmounts = ['10', '50', '100', '1000'].filter(
    amt => parseFloat(amt) <= balance
  )

  const handleContinue = () => {
    const withdrawAmount = parseFloat(amount)
    
    if (!amount || withdrawAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    if (withdrawAmount > balance) {
      toast.error(`Insufficient balance. You have $${balance.toFixed(2)}`)
      return
    }
    
    if (withdrawAmount < 1) {
      toast.error('Minimum withdrawal is $1')
      return
    }
    
    setStep('method')
  }

  const handleMethodSelect = async (method: WithdrawMethod) => {
    setWithdrawMethod(method)

    if (method === 'bank') {
      // Show bank account form
      setStep('bank')
    } else if (method === 'kotani-pay') {
      // Show Kotani Pay withdraw form
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
        throw new Error('Please sign in to withdraw funds')
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
        throw new Error(errorData.error || 'Failed to create withdrawal session')
      }

      const { sessionToken } = await response.json()
      const redirectUrl = encodeURIComponent(`${apiBaseUrl}/dashboard`)
      const partnerUserId = session.user.id
      
      // Create widget URL for withdrawal - USDC on Base
      const widgetUrl = `https://pay.coinbase.com/v3/sell/input?sessionToken=${sessionToken}&defaultAsset=USDC&defaultNetwork=base&presetCryptoAmount=${amount}&redirectUrl=${redirectUrl}&partnerUserId=${partnerUserId}`
      
      // Open Coinbase withdrawal window
      const withdrawWindow = window.open(widgetUrl, '_blank', 'width=500,height=700,scrollbars=yes,resizable=yes')
      
      if (!withdrawWindow) {
        throw new Error('Please allow popups to complete withdrawal')
      }
      
      // Store URL for reopen option and show waiting screen
      setWidgetUrl(widgetUrl)
      setStep('coinbase-widget')
    } catch (error) {
      console.error('Withdraw error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Withdrawal failed')
      setStep('error')
    }
  }

  const handleClose = () => {
    const wasSuccess = step === 'success'
    setStep('amount')
    setAmount('')
    setWithdrawMethod(null)
    setErrorMessage('')
    setWidgetUrl(null)
    onOpenChange(false)

    if (wasSuccess && onWithdrawSuccess) {
      onWithdrawSuccess()
    }
  }

  const handleBack = () => {
    if (step === 'method') setStep('amount')
    else if (step === 'bank') setStep('method')
    else if (step === 'kotani-pay') setStep('method')
    else if (step === 'coinbase-widget') {
      setWidgetUrl(null)
      setStep('method')
    }
    else if (step === 'error') setStep('method')
  }

  const setMaxAmount = () => {
    setAmount(balance.toString())
  }

  const handleWidgetComplete = () => {
    toast.info('If you completed the withdrawal, your funds will arrive within a few minutes.')
    handleClose()
    if (onWithdrawSuccess) onWithdrawSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(step === 'method' || step === 'bank' || step === 'kotani-pay' || step === 'coinbase-widget' || step === 'error') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span>Withdraw USD</span>
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Amount Selection */}
        {step === 'amount' && (
          <div className="space-y-6 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available Balance</span>
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">${balance.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base">How much would you like to withdraw?</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  max={balance}
                  className="pl-10 text-2xl h-14 font-semibold"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8"
                  onClick={setMaxAmount}
                >
                  Max
                </Button>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimum: $1</span>
                <span>Available: ${balance.toFixed(2)}</span>
              </div>
            </div>

            {quickAmounts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Quick Select</Label>
                <div className="grid grid-cols-3 gap-2">
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
            )}

            <Button
              onClick={handleContinue}
              className="w-full h-12 text-base bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
              size="lg"
            >
              Continue
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Funds will be sent to your chosen payment method
            </p>
          </div>
        )}

        {/* Step 2: Withdrawal Method Selection */}
        {step === 'method' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Choose where to receive your <span className="font-semibold">${amount}</span>
            </p>

            <div className="space-y-3">
              <Card
                className="cursor-pointer hover:border-primary transition-all hover:shadow-md py-0 gap-0"
                onClick={() => handleMethodSelect('bank')}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-6 w-6 text-zinc-700" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">Bank Account</h4>
                    <p className="text-sm text-muted-foreground">1-3 business days • No fees</p>
                  </div>
                  <div className="text-sm font-semibold text-emerald-500">Recommended</div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:border-primary transition-all hover:shadow-md py-0 gap-0"
                onClick={() => handleMethodSelect('coinbase')}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">C</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">Coinbase</h4>
                    <p className="text-sm text-muted-foreground">Instant • Multiple options</p>
                  </div>
                </CardContent>
              </Card>

              {/* Kotani Pay Option - African Markets */}
              <KotaniPayOption
                type="withdraw"
                onClick={() => handleMethodSelect('kotani-pay')}
              />
            </div>

            <p className="text-xs text-center text-muted-foreground pt-2">
              All withdrawals are processed securely
            </p>
          </div>
        )}

        {/* Step 2.5: Bank Account Form */}
        {step === 'bank' && (
          <BankAccountForm
            amount={parseFloat(amount)}
            walletAddress={walletAddress}
            onSuccess={() => setStep('success')}
            onBack={() => setStep('method')}
          />
        )}

        {/* Step 2.5b: Kotani Pay Withdraw Form */}
        {step === 'kotani-pay' && (
          <KotaniPayWithdrawForm
            walletAddress={walletAddress}
            amount={amount}
            currentBalance={balance}
            onSuccess={() => {
              setStep('success')
              toast.success('Withdrawal initiated! Funds will arrive in 5-30 minutes.')
              if (onWithdrawSuccess) onWithdrawSuccess()
            }}
            onBack={handleBack}
          />
        )}

        {/* Step 2.6: Coinbase Withdrawal Window */}
        {step === 'coinbase-widget' && widgetUrl && (
          <div className="space-y-6 py-6">
            <div className="bg-gradient-to-r from-orange-50 to-zinc-50 p-6 rounded-lg border border-orange-200">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-2xl">C</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-2">Complete Withdrawal in Coinbase Window</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    A secure Coinbase withdrawal window has been opened. Complete your ${amount} USD withdrawal there.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                      <span>Waiting for withdrawal...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <h5 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-orange-600" />
                What to do next:
              </h5>
              <ol className="space-y-2 text-sm text-muted-foreground ml-6">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">1.</span>
                  <span>Complete the withdrawal in the Coinbase window</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">2.</span>
                  <span>Select your payment method and bank account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">3.</span>
                  <span>Click "Done" below once you've completed the withdrawal</span>
                </li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => window.open(widgetUrl, '_blank', 'width=500,height=700')}
                variant="outline"
                className="flex-1"
              >
                Reopen Withdrawal Window
              </Button>
              <Button
                onClick={handleWidgetComplete}
                className="flex-1 bg-orange-600 hover:bg-orange-500"
              >
                Done
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Don't see the withdrawal window? Check if popups are blocked or click "Reopen Withdrawal Window"
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
            <h3 className="text-lg font-semibold">Processing Withdrawal</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Please wait while we securely process your ${amount} withdrawal...
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
            <h3 className="text-xl font-bold text-center">Withdrawal Initiated!</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Your ${amount} withdrawal is being processed. Funds will arrive according to your selected method.
            </p>
            <div className="w-full pt-4 space-y-2">
              <Button
                onClick={handleClose}
                className="w-full bg-orange-600 hover:bg-orange-500"
              >
                Done
              </Button>
              <Button
                onClick={() => {
                  handleClose()
                  if (onWithdrawSuccess) onWithdrawSuccess()
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
            <h3 className="text-xl font-bold text-center">Withdrawal Failed</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {errorMessage || 'Something went wrong processing your withdrawal. Please try again.'}
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
