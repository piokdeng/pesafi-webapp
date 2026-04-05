'use client'

/**
 * Kotani Pay Payment Option Card
 * Displays Kotani Pay as a payment method option in deposit/withdraw modals
 */

import { Card, CardContent } from '@/components/ui/card'

interface KotaniPayOptionProps {
  onClick: () => void
  type: 'deposit' | 'withdraw'
}

export default function KotaniPayOption({ onClick, type }: KotaniPayOptionProps) {
  return (
    <Card
      className="cursor-pointer hover:bg-accent hover:border-primary transition-all py-0 gap-0"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">K</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-base">Mobile Money</h4>
              <span className="text-xs font-semibold text-emerald-500">Recommended</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {type === 'deposit'
                ? 'M-Pesa, MTN, Airtel'
                : 'Withdraw to mobile money or bank'
              }
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>10+ countries</span>
              <span>5-30 min</span>
              {type === 'deposit' && <span>Secure</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
