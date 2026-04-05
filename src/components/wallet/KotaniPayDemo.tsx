'use client'

/**
 * Kotani Pay Demo Component
 * Standalone component to test Kotani Pay integration
 *
 * Usage:
 * import KotaniPayDemo from '@/components/wallet/KotaniPayDemo'
 * <KotaniPayDemo walletAddress="0x..." />
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import KotaniPayDepositForm from './KotaniPayDepositForm'
import KotaniPayWithdrawForm from './KotaniPayWithdrawForm'

interface KotaniPayDemoProps {
  walletAddress: string
  currentBalance?: number
}

export default function KotaniPayDemo({
  walletAddress,
  currentBalance = 100
}: KotaniPayDemoProps) {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('50')

  const handleSuccess = () => {
    setShowForm(false)
    setAmount('50')
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Kotani Pay Integration Demo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test Kotani Pay deposit and withdrawal flows
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'deposit' | 'withdraw')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="deposit">Deposit (Onramp)</TabsTrigger>
              <TabsTrigger value="withdraw">Withdraw (Offramp)</TabsTrigger>
            </TabsList>

            <TabsContent value="deposit" className="space-y-4 mt-4">
              {!showForm ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Test Deposit Flow</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Simulate depositing crypto to receive fiat via Kotani Pay
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Amount"
                        className="px-3 py-2 border rounded-md w-32"
                      />
                      <span className="text-sm text-muted-foreground">USDC</span>
                      <Button onClick={() => setShowForm(true)} className="ml-auto">
                        Start Deposit
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="text-sm font-semibold">How it works:</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Enter your details and select network</li>
                      <li>Get a deposit address from Kotani Pay</li>
                      <li>Send crypto to that address</li>
                      <li>Receive fiat in your mobile money/bank (1-2 min)</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <KotaniPayDepositForm
                  walletAddress={walletAddress}
                  amount={amount}
                  onSuccess={handleSuccess}
                  onBack={() => setShowForm(false)}
                />
              )}
            </TabsContent>

            <TabsContent value="withdraw" className="space-y-4 mt-4">
              {!showForm ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Test Withdraw Flow</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Simulate withdrawing crypto to receive fiat via Kotani Pay
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Amount"
                        max={currentBalance}
                        className="px-3 py-2 border rounded-md w-32"
                      />
                      <span className="text-sm text-muted-foreground">
                        USDC (Balance: ${currentBalance})
                      </span>
                      <Button onClick={() => setShowForm(true)} className="ml-auto">
                        Start Withdraw
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="text-sm font-semibold">How it works:</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Choose mobile money or bank transfer</li>
                      <li>Enter recipient details</li>
                      <li>Confirm withdrawal</li>
                      <li>Receive fiat in 5-30 minutes</li>
                      <li>Auto-refund if transfer fails</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <KotaniPayWithdrawForm
                  walletAddress={walletAddress}
                  amount={amount}
                  currentBalance={currentBalance}
                  onSuccess={handleSuccess}
                  onBack={() => setShowForm(false)}
                />
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="text-sm font-semibold text-amber-900 mb-2">
              Demo Mode
            </h4>
            <p className="text-xs text-amber-800">
              This is a demo interface. To enable real transactions, add your Kotani Pay
              API credentials to <code className="bg-amber-100 px-1 py-0.5 rounded">.env.local</code>
            </p>
            <p className="text-xs text-amber-800 mt-2">
              See <code className="bg-amber-100 px-1 py-0.5 rounded">KOTANI_PAY_QUICKSTART.md</code> for setup instructions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
