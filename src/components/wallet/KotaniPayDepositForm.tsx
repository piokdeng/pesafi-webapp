'use client'

/**
 * Kotani Pay Deposit Form
 * Allows users to pay fiat (mobile money) and receive USDC.
 * Works in two modes (transparent to user):
 * - Onramp: Kotani delivers USDC on-chain (if enabled for country)
 * - Collection: Kotani collects fiat, KermaPay credits USDC internally
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle2, ExternalLink, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseAuthClient } from '@/lib/supabase-auth-client'
import { detectCurrencyFromPhone as sharedDetectCurrency, detectCountryFromPhone, getDefaultProviderForCountry, validateMobileMoneyCombo } from '@/lib/mobile-money-validation'

interface KotaniPayDepositFormProps {
  walletAddress: string
  amount: string
  onSuccess?: () => void
  onBack?: () => void
}

type DepositStep = 'provider' | 'details' | 'processing' | 'instructions' | 'success'

const PROVIDERS = [
  {
    code: 'MPESA',
    name: 'M-Pesa',
    description: 'Kenya, Tanzania',
    defaultCurrency: 'KES',
    phonePlaceholder: '+254712345678',
  },
  {
    code: 'MTN',
    name: 'MTN Mobile Money',
    description: 'Uganda, Ghana, South Sudan',
    defaultCurrency: 'UGX',
    phonePlaceholder: '+256712345678',
  },
  {
    code: 'AIRTEL',
    name: 'Airtel Money',
    description: 'Uganda, Tanzania',
    defaultCurrency: 'UGX',
    phonePlaceholder: '+256712345678',
  },
]

// Use shared detection utility
function detectCurrencyFromPhone(phone: string): string | null {
  return sharedDetectCurrency(phone)
}

export default function KotaniPayDepositForm({
  walletAddress,
  amount,
  onSuccess,
  onBack
}: KotaniPayDepositFormProps) {
  const [step, setStep] = useState<DepositStep>('provider')
  const [loading, setLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<typeof PROVIDERS[0] | null>(null)

  const [accountName, setAccountName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [currency, setCurrency] = useState('KES')
  const [fiatAmount, setFiatAmount] = useState(amount)

  const [referenceId, setReferenceId] = useState('')
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const [quotedCryptoAmount, setQuotedCryptoAmount] = useState<number | null>(null)
  const [depositMode, setDepositMode] = useState<string>('onramp')

  const chain = 'BASE'
  const token = 'USDC'

  const handleProviderSelect = (provider: typeof PROVIDERS[0]) => {
    setSelectedProvider(provider)
    setCurrency(provider.defaultCurrency)
    setStep('details')
  }

  // Auto-detect currency and provider when phone number changes
  const handlePhoneChange = useCallback((value: string) => {
    setPhoneNumber(value)
    const detected = detectCurrencyFromPhone(value)
    if (detected) setCurrency(detected)
    const country = detectCountryFromPhone(value)
    if (country && selectedProvider) {
      const bestProvider = getDefaultProviderForCountry(country)
      // Only auto-switch provider if current one doesn't match the country
      if (bestProvider !== selectedProvider.code) {
        const match = PROVIDERS.find(p => p.code === bestProvider)
        if (match) setSelectedProvider(match)
      }
    }
  }, [selectedProvider])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!accountName || !phoneNumber) {
      toast.error('Please fill in all fields')
      return
    }

    // Auto-correct currency from phone number
    const detectedCurrency = detectCurrencyFromPhone(phoneNumber)
    if (detectedCurrency && detectedCurrency !== currency) {
      setCurrency(detectedCurrency)
    }
    const effectiveCurrency = detectedCurrency || currency

    // Validate phone/provider/currency combo
    const providerCode = selectedProvider?.code || 'MPESA'
    const validation = validateMobileMoneyCombo(phoneNumber, providerCode, effectiveCurrency)
    if (!validation.valid) {
      toast.error(validation.error!)
      return
    }

    setLoading(true)
    setStep('processing')

    try {
      const { data: { session } } = await supabaseAuthClient.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Please sign in to deposit funds')
      }

      const response = await fetch('/api/kotani-pay/onramp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fiatAmount: parseFloat(fiatAmount),
          currency,
          chain,
          token,
          phoneNumber,
          accountName,
          providerNetwork: selectedProvider?.code || 'MPESA',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate deposit')
      }

      setReferenceId(data.data.referenceId)
      setRedirectUrl(data.data.redirectUrl || null)
      setQuotedCryptoAmount(typeof data.data.cryptoAmount === 'number' ? data.data.cryptoAmount : null)
      setDepositMode(data.data.mode || 'onramp')

      toast.success('Payment initiated! Check your phone.')
      setStep('instructions')

    } catch (error: any) {
      console.error('Deposit error:', error)
      toast.error(error.message || 'Failed to initiate deposit')
      setStep('details')
    } finally {
      setLoading(false)
    }
  }

  // Step 1: Choose mobile money provider
  if (step === 'provider') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Deposit via Mobile Money</h3>
          <p className="text-sm text-muted-foreground">
            Pay with mobile money to receive {token} in your wallet
          </p>
        </div>

        <div className="grid gap-3">
          {PROVIDERS.map((provider) => (
            <Card
              key={provider.code}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleProviderSelect(provider)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{provider.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {provider.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {onBack && (
          <Button variant="outline" onClick={onBack} className="w-full">
            Back
          </Button>
        )}
      </div>
    )
  }

  // Step 2: Enter details
  if (step === 'details') {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedProvider?.name} Deposit
                </h3>
                <p className="text-sm text-muted-foreground">
                  Pay with {selectedProvider?.name} and receive {token}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={selectedProvider?.phonePlaceholder || '+254712345678'}
                    value={phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Include country code. Currency auto-detects from your number.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name (as on mobile money)</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fiatAmount">Amount ({currency})</Label>
                  <Input
                    id="fiatAmount"
                    type="number"
                    min="1"
                    step="any"
                    value={fiatAmount}
                    onChange={(e) => setFiatAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="KES">KES (Kenya)</option>
                    <option value="UGX">UGX (Uganda)</option>
                    <option value="TZS">TZS (Tanzania)</option>
                    <option value="GHS">GHS (Ghana)</option>
                    <option value="SSP">SSP (South Sudan)</option>
                    <option value="NGN">NGN (Nigeria)</option>
                    <option value="ZAR">ZAR (South Africa)</option>
                    <option value="RWF">RWF (Rwanda)</option>
                    <option value="CDF">CDF (DRC)</option>
                    <option value="ETB">ETB (Ethiopia)</option>
                    <option value="ZMW">ZMW (Zambia)</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('provider')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={loading}
                  >
                    Continue
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 3: Processing
  if (step === 'processing') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Processing Request</h3>
              <p className="text-sm text-muted-foreground">
                Setting up your deposit...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Step 4: Payment Instructions
  if (step === 'instructions') {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">1</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Approve the Payment</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {redirectUrl
                      ? 'Click the payment link to complete checkout'
                      : 'A prompt will appear on your phone. Approve it to complete payment.'
                    }
                  </p>
                  {redirectUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(redirectUrl, '_blank')}
                      className="w-full"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Payment Link
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">2</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Wait for Confirmation</h4>
                  <p className="text-sm text-muted-foreground">
                    Your {token} balance will update once payment is confirmed.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Use the phone number registered with your {selectedProvider?.name || 'mobile money'} account.
                </p>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>Reference: {referenceId}</p>
                <p>Amount: {fiatAmount} {currency}</p>
                {quotedCryptoAmount !== null && <p>Estimated: ~{quotedCryptoAmount} {token}</p>}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(`https://basescan.org/address/${walletAddress}`, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Wallet
                </Button>
                <Button
                  onClick={() => onSuccess?.()}
                  className="flex-1"
                >
                  I Approved the Payment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Step 5: Success
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Deposit Initiated</h3>
            <p className="text-sm text-muted-foreground">
              We'll notify you once your deposit is confirmed
            </p>
          </div>
          <Button onClick={onSuccess} className="mt-4">
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
