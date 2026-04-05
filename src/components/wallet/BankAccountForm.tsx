'use client'

/**
 * Bank Account Form
 * 
 * Direct bank withdrawal integration (Stripe Connect ready)
 * Shows professional bank account input with validation
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface BankAccountFormProps {
  amount: number
  walletAddress: string
  onSuccess: () => void
  onBack: () => void
}

export default function BankAccountForm({
  amount,
  walletAddress,
  onSuccess,
  onBack
}: BankAccountFormProps) {
  const [loading, setLoading] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [routingNumber, setRoutingNumber] = useState('')
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking')
  const [bankName, setBankName] = useState('')

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 17) {
      setAccountNumber(value)
    }
  }

  const handleRoutingNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 9) {
      setRoutingNumber(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!accountName || accountName.length < 3) {
      toast.error('Please enter the account holder name')
      return
    }

    if (!accountNumber || accountNumber.length < 8) {
      toast.error('Please enter a valid account number')
      return
    }

    if (!routingNumber || routingNumber.length !== 9) {
      toast.error('Routing number must be 9 digits')
      return
    }

    if (!bankName || bankName.length < 3) {
      toast.error('Please enter your bank name')
      return
    }

    setLoading(true)

    try {
      // TODO: Call withdrawal API
      // const response = await fetch('/api/payments/create-withdrawal', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     amount,
      //     walletAddress,
      //     bankDetails: {
      //       accountName,
      //       accountNumber,
      //       routingNumber,
      //       accountType,
      //       bankName,
      //     },
      //   }),
      // })

      // For now, show setup message
      toast.error('Direct bank withdrawals are being set up. Please use Coinbase for now.')
      await new Promise(resolve => setTimeout(resolve, 1000))
      onBack()
    } catch (error) {
      console.error('Bank withdrawal error:', error)
      toast.error(error instanceof Error ? error.message : 'Withdrawal failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="text-center pb-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full">
          <Lock className="h-4 w-4 text-zinc-700" />
          <span className="text-sm font-medium text-zinc-900">
            Secure Withdrawal
          </span>
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Amount to withdraw</span>
          <span className="text-2xl font-bold">${amount}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accountName">Account Holder Name</Label>
          <Input
            id="accountName"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="John Doe"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bankName">Bank Name</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="bankName"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Chase Bank"
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountType">Account Type</Label>
          <Select value={accountType} onValueChange={(value: 'checking' | 'savings') => setAccountType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checking">Checking Account</SelectItem>
              <SelectItem value="savings">Savings Account</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="routingNumber">Routing Number</Label>
            <Input
              id="routingNumber"
              value={routingNumber}
              onChange={handleRoutingNumberChange}
              placeholder="123456789"
              required
            />
            <p className="text-xs text-muted-foreground">9 digits</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              value={accountNumber}
              onChange={handleAccountNumberChange}
              placeholder="1234567890"
              type="password"
              required
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
        >
          {loading ? 'Processing...' : `Withdraw $${amount}`}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="w-full"
        >
          Back to Methods
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 pt-2">
        <Lock className="h-3 w-3 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Your bank information is encrypted and secure
        </p>
      </div>

      <div className="text-center">
        <p className="text-xs text-yellow-600 bg-yellow-50 p-3 rounded-lg">
          🏦 Direct bank withdrawals coming soon! For now, please use Coinbase option.
        </p>
      </div>
    </form>
  )
}
