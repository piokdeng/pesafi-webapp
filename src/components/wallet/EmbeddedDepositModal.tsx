'use client'

/**
 * Embedded Deposit Modal
 * 
 * Shows Coinbase widget INSIDE the modal instead of opening a popup
 * Gives you full control over the UI and flow
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseAuthClient } from '@/lib/supabase-auth-client'

interface EmbeddedDepositModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletAddress: string
  onDepositSuccess?: () => void
}

export default function EmbeddedDepositModal({
  open,
  onOpenChange,
  walletAddress,
  onDepositSuccess
}: EmbeddedDepositModalProps) {
  const [amount, setAmount] = useState('50')
  const [loading, setLoading] = useState(false)
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null)

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      setLoading(true)
      const { data: { session } } = await supabaseAuthClient.auth.getSession()
      
      if (!session?.access_token) {
        toast.error('Please sign in to deposit funds')
        return
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
        throw new Error(errorData.error || 'Failed to create session token')
      }

      const { sessionToken } = await response.json()
      const redirectUrl = encodeURIComponent(`${apiBaseUrl}/dashboard`)
      const partnerUserId = session.user.id
      
      // Create widget URL for embedding
      const appId = process.env.NEXT_PUBLIC_COINBASE_PROJECT_ID || ''
      const url = `https://pay.coinbase.com/buy/select-asset?sessionToken=${sessionToken}&appId=${appId}&defaultAsset=USDC&defaultNetwork=base&presetFiatAmount=${amount}&redirectUrl=${redirectUrl}&partnerUserId=${partnerUserId}`
      
      setWidgetUrl(url)
      toast.success('Loading Coinbase payment...')
    } catch (error) {
      console.error('Deposit error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load deposit')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setWidgetUrl(null)
    setAmount('50')
    onOpenChange(false)
    // Refresh balance after closing (user might have completed payment)
    if (onDepositSuccess) {
      onDepositSuccess()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Deposit USDC</span>
            {widgetUrl && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {!widgetUrl ? (
          // Amount selection screen
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Buy USDC with credit/debit card via Coinbase
            </p>
            
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50"
                min="10"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['10', '50', '100', '1000'].map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(amt)}
                  disabled={loading}
                >
                  ${amt}
                </Button>
              ))}
            </div>

            <Button
              onClick={handleDeposit}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Continue to Payment'
              )}
            </Button>
          </div>
        ) : (
          // Embedded Coinbase widget
          <div className="relative w-full h-[600px]">
            <iframe
              src={widgetUrl}
              className="w-full h-full border-0 rounded-lg"
              allow="payment"
              title="Coinbase Deposit"
            />
            <p className="text-xs text-center text-muted-foreground mt-2">
              Complete your purchase in the widget above. You can close this when done.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
