'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'

export function SmartWalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  // Get Coinbase Wallet connector
  const coinbaseConnector = connectors.find(
    (connector) => connector.id === 'coinbaseWalletSDK'
  )

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <p className="font-medium">Smart Wallet Connected</p>
          <p className="text-xs text-muted-foreground">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>
        <Button onClick={() => disconnect()} variant="outline" size="sm">
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={() => {
        if (coinbaseConnector) {
          connect({ connector: coinbaseConnector })
        }
      }}
      disabled={!coinbaseConnector}
      className="bg-zinc-700 hover:bg-zinc-600"
    >
      <Wallet className="h-4 w-4 mr-2" />
      Connect Smart Wallet
    </Button>
  )
}
