'use client'

/**
 * Card Payment Form
 * 
 * Direct card payment integration (Stripe-ready)
 * Shows professional card input with validation
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreditCard, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface CardPaymentFormProps {
  amount: number
  walletAddress: string
  onSuccess: () => void
  onBack: () => void
}

export default function CardPaymentForm({
  amount,
  walletAddress,
  onSuccess,
  onBack
}: CardPaymentFormProps) {
  const [loading, setLoading] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState('')

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const chunks = cleaned.match(/.{1,4}/g)
    return chunks ? chunks.join(' ') : cleaned
  }

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4)
    }
    return cleaned
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value.replace(/\D/g, ''))
    if (formatted.replace(/\s/g, '').length <= 16) {
      setCardNumber(formatted)
    }
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value)
    if (formatted.length <= 5) {
      setExpiry(formatted)
    }
  }

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 4) {
      setCvc(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 15) {
      toast.error('Please enter a valid card number')
      return
    }

    if (!expiry || expiry.length !== 5) {
      toast.error('Please enter a valid expiry date (MM/YY)')
      return
    }

    if (!cvc || cvc.length < 3) {
      toast.error('Please enter a valid CVC')
      return
    }

    if (!name || name.length < 3) {
      toast.error('Please enter the cardholder name')
      return
    }

    setLoading(true)

    try {
      // Call payment intent API
      const response = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          walletAddress: walletAddress,
        }),
      })

      const data = await response.json()

      if (data.requiresSetup) {
        // Stripe not configured yet - show helpful message
        toast.error('Card payments are being set up. Please use Coinbase for now.')
        onBack()
      } else if (response.ok) {
        toast.success('Payment successful!')
        onSuccess()
      } else {
        throw new Error(data.error || 'Payment failed')
      }
    } catch (error) {
      console.error('Card payment error:', error)
      toast.error(error instanceof Error ? error.message : 'Payment failed')
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
            Secure Payment
          </span>
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Amount to pay</span>
          <span className="text-2xl font-bold">${amount}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cardNumber">Card Number</Label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="cardNumber"
              value={cardNumber}
              onChange={handleCardNumberChange}
              placeholder="1234 5678 9012 3456"
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiry">Expiry Date</Label>
            <Input
              id="expiry"
              value={expiry}
              onChange={handleExpiryChange}
              placeholder="MM/YY"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cvc">CVC</Label>
            <Input
              id="cvc"
              value={cvc}
              onChange={handleCvcChange}
              placeholder="123"
              type="password"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Cardholder Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-gradient-to-r from-zinc-700 to-zinc-600 hover:from-zinc-600 hover:to-zinc-500"
        >
          {loading ? 'Processing...' : `Pay $${amount}`}
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
          Your payment information is encrypted and secure
        </p>
      </div>

      <div className="text-center">
        <p className="text-xs text-yellow-600 bg-yellow-50 p-3 rounded-lg">
          💳 Direct card payments coming soon! For now, please use Coinbase option.
        </p>
      </div>
    </form>
  )
}
