'use client'

/**
 * Kotani Pay Withdraw Form (Offramp)
 * Allows users to withdraw crypto and receive fiat in mobile money or bank
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle2, Smartphone, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseAuthClient } from '@/lib/supabase-auth-client'
import { detectCurrencyFromPhone, detectCountryFromPhone, getDefaultProviderForCountry, validateMobileMoneyCombo, getMinimumLocalAmount } from '@/lib/mobile-money-validation'

interface KotaniPayWithdrawFormProps {
  walletAddress: string
  amount: string
  currentBalance: number
  onSuccess?: () => void
  onBack?: () => void
}

type WithdrawStep = 'method' | 'details' | 'processing' | 'success'
type WithdrawalMethod = 'mobile_money' | 'bank'

const CURRENCIES = [
  { code: 'KES', name: 'Kenyan Shilling', country: 'Kenya' },
  { code: 'GHS', name: 'Ghanaian Cedi', country: 'Ghana' },
  { code: 'UGX', name: 'Ugandan Shilling', country: 'Uganda' },
  { code: 'TZS', name: 'Tanzanian Shilling', country: 'Tanzania' },
  { code: 'SSP', name: 'South Sudanese Pound', country: 'South Sudan' },
  { code: 'NGN', name: 'Nigerian Naira', country: 'Nigeria' },
  { code: 'ZAR', name: 'South African Rand', country: 'South Africa' },
]

const MOBILE_PROVIDERS = [
  { code: 'MPESA', name: 'M-Pesa', countries: ['Kenya'] },
  { code: 'MTN', name: 'MTN Mobile Money', countries: ['Ghana', 'Uganda', 'South Sudan'] },
  { code: 'AIRTEL', name: 'Airtel Money', countries: ['Uganda', 'Tanzania'] },
]

export default function KotaniPayWithdrawForm({
  walletAddress,
  amount,
  currentBalance,
  onSuccess,
  onBack
}: KotaniPayWithdrawFormProps) {
  const [step, setStep] = useState<WithdrawStep>('method')
  const [loading, setLoading] = useState(false)
  const [method, setMethod] = useState<WithdrawalMethod | null>(null)

  // Mobile Money fields
  const [phoneNumber, setPhoneNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [networkProvider, setNetworkProvider] = useState('MPESA')

  // Bank fields
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [country, setCountry] = useState('KE')

  // Common fields
  const [currency, setCurrency] = useState('KES')
  const [referenceId, setReferenceId] = useState('')

  const handleMethodSelect = (selectedMethod: WithdrawalMethod) => {
    setMethod(selectedMethod)
    setStep('details')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (parseFloat(amount) > currentBalance) {
      toast.error('Insufficient balance')
      return
    }

    if (method === 'mobile_money') {
      if (!phoneNumber || !accountName || !networkProvider) {
        toast.error('Please fill in all mobile money fields')
        return
      }
      // Auto-correct currency and provider from phone number
      const detectedCurrency = detectCurrencyFromPhone(phoneNumber)
      if (detectedCurrency && detectedCurrency !== currency) {
        setCurrency(detectedCurrency)
      }
      const detectedCountry = detectCountryFromPhone(phoneNumber)
      if (detectedCountry) {
        const bestProvider = getDefaultProviderForCountry(detectedCountry)
        if (bestProvider !== networkProvider) {
          setNetworkProvider(bestProvider)
        }
      }
      const effectiveCurrency = detectedCurrency || currency
      const effectiveProvider = detectedCountry
        ? getDefaultProviderForCountry(detectedCountry)
        : networkProvider
      // Validate phone/provider/currency combo
      const validation = validateMobileMoneyCombo(phoneNumber, effectiveProvider, effectiveCurrency)
      if (!validation.valid) {
        toast.error(validation.error!)
        return
      }
    } else if (method === 'bank') {
      if (!bankName || !accountNumber || !bankCode) {
        toast.error('Please fill in all bank details')
        return
      }
    }

    setLoading(true)
    setStep('processing')

    try {
      const { data: { session } } = await supabaseAuthClient.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Please sign in to withdraw funds')
      }

      const requestBody: any = {
        amount: parseFloat(amount),
        currency,
        chain: 'BASE',
        token: 'USDC',
        withdrawalMethod: method,
      }

      if (method === 'mobile_money') {
        requestBody.mobileMoneyDetails = {
          phoneNumber,
          accountName,
          networkProvider,
        }
      } else {
        requestBody.bankDetails = {
          name: accountName,
          accountNumber,
          bankCode: parseInt(bankCode),
          phoneNumber: phoneNumber || '',
          address: '',
          country,
        }
      }

      const response = await fetch('/api/kotani-pay/offramp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send funds. Please try again.')
      }

      setReferenceId(data.data.referenceId || data.data.kotaniReferenceId || '')
      toast.success('Withdrawal initiated successfully')
      setStep('success')

    } catch (error: any) {
      console.error('Kotani Pay withdrawal error:', error)
      toast.error(error.message || 'Failed to send funds. Please try again.')
      setStep('details')
    } finally {
      setLoading(false)
    }
  }

  // Step 1: Method Selection
  if (step === 'method') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Choose Withdrawal Method</h3>
          <p className="text-sm text-muted-foreground">
            Select how you want to receive your funds
          </p>
        </div>

        <div className="grid gap-3">
          <Card
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => handleMethodSelect('mobile_money')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Mobile Money</h4>
                  <p className="text-sm text-muted-foreground">
                    M-Pesa, MTN, Airtel Money
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => handleMethodSelect('bank')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/15 rounded-full flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Bank Transfer</h4>
                  <p className="text-sm text-muted-foreground">
                    Direct to your bank account
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {onBack && (
          <Button variant="outline" onClick={onBack} className="w-full">
            Back
          </Button>
        )}
      </div>
    )
  }

  // Step 2: Details Form
  if (step === 'details') {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  {method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'} Details
                </h3>
                <p className="text-sm text-muted-foreground">
                  Withdrawing ${amount} USDC
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.name} ({curr.code}) - {curr.country}
                    </option>
                  ))}
                </select>
              </div>

              {method === 'mobile_money' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="provider">Mobile Money Provider</Label>
                    <select
                      id="provider"
                      value={networkProvider}
                      onChange={(e) => setNetworkProvider(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      {MOBILE_PROVIDERS.map((provider) => (
                        <option key={provider.code} value={provider.code}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+254712345678"
                      value={phoneNumber}
                      onChange={(e) => {
                        const phone = e.target.value
                        setPhoneNumber(phone)
                        // Auto-detect currency and provider from phone
                        const detected = detectCurrencyFromPhone(phone)
                        if (detected) setCurrency(detected)
                        const country = detectCountryFromPhone(phone)
                        if (country) setNetworkProvider(getDefaultProviderForCountry(country))
                      }}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Include country code (e.g., +254 for Kenya). Currency auto-detects.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-name">Account Name</Label>
                    <Input
                      id="account-name"
                      type="text"
                      placeholder="John Doe"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="bank-name">Bank Name</Label>
                    <Input
                      id="bank-name"
                      type="text"
                      placeholder="Equity Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank-code">Bank Code</Label>
                    <Input
                      id="bank-code"
                      type="text"
                      placeholder="123"
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-number">Account Number</Label>
                    <Input
                      id="account-number"
                      type="text"
                      placeholder="1234567890"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-name">Account Holder Name</Label>
                    <Input
                      id="account-name"
                      type="text"
                      placeholder="John Doe"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <select
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="KE">Kenya</option>
                      <option value="GH">Ghana</option>
                      <option value="UG">Uganda</option>
                      <option value="TZ">Tanzania</option>
                      <option value="NG">Nigeria</option>
                      <option value="ZA">South Africa</option>
                    </select>
                  </div>
                </>
              )}

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  Estimated time: 5-30 minutes. If the transfer fails, your funds will be automatically refunded after 5 minutes.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('method')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Withdraw $${amount}`
                  )}
                </Button>
              </div>
            </form>
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
              <h3 className="text-lg font-semibold">Processing Withdrawal</h3>
              <p className="text-sm text-muted-foreground">
                Converting and sending your funds...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Step 4: Success
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Withdrawal Initiated</h3>
            <p className="text-sm text-muted-foreground">
              {method === 'mobile_money' ? accountName : 'Recipient'} will receive funds shortly.
            </p>
            {referenceId && (
              <p className="text-xs text-muted-foreground">
                Reference ID: {referenceId}
              </p>
            )}
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md w-full">
            <p className="text-sm text-blue-800">
              We'll notify you once your withdrawal is complete. Estimated time: 5-30 minutes.
            </p>
          </div>
          <Button onClick={onSuccess} className="w-full mt-4">
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
