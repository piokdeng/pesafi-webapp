'use client'

/**
 * Kotani Pay Demo Page
 * Test the integration without real API credentials
 */

import KotaniPayDemo from '@/components/wallet/KotaniPayDemo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'

export default function KotaniDemoPage() {
  // Mock wallet address for demo
  const mockWalletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  const mockBalance = 500

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Kotani Pay Integration Demo</h1>
        <p className="text-muted-foreground">
          Test the Kotani Pay deposit and withdrawal flows
        </p>
      </div>

      <Alert className="mb-6">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          <strong>Demo Mode:</strong> This page lets you test the UI/UX without real API credentials.
          The forms will work, but API calls will fail gracefully. Add real credentials to{' '}
          <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> to enable live transactions.
        </AlertDescription>
      </Alert>

      <KotaniPayDemo
        walletAddress={mockWalletAddress}
        currentBalance={mockBalance}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-semibold mb-1">1. Get API Credentials</h4>
            <p className="text-sm text-muted-foreground">
              Email: <a href="mailto:[email protected]" className="text-primary underline">
                [email protected]
              </a>
            </p>
            <p className="text-sm text-muted-foreground">
              Or use template: <code className="bg-muted px-1 py-0.5 rounded">EMAIL_TEMPLATE_KOTANI.md</code>
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-1">2. Add Credentials to .env.local</h4>
            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`KOTANI_PAY_API_KEY=your_jwt_token
KOTANI_PAY_BASE_URL=https://sandbox-api.kotanipay.io/api/v3
KOTANI_PAY_WEBHOOK_SECRET=$(openssl rand -hex 32)`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-1">3. Test Integration</h4>
            <pre className="text-xs bg-muted p-2 rounded mt-1">
              npm run dev
              ./scripts/test-kotani-pay.sh
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-1">4. Integrate into Your App</h4>
            <p className="text-sm text-muted-foreground">
              See: <code className="bg-muted px-1 py-0.5 rounded">
                src/components/wallet/INTEGRATION_GUIDE.md
              </code>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 border rounded-lg space-y-2">
        <h4 className="font-semibold">📚 Documentation</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Quick Start: <code className="bg-muted px-1 py-0.5 rounded">KOTANI_PAY_QUICKSTART.md</code></li>
          <li>• Full Setup: <code className="bg-muted px-1 py-0.5 rounded">docs/api-integration/KOTANI_PAY_SETUP.md</code></li>
          <li>• Integration: <code className="bg-muted px-1 py-0.5 rounded">src/components/wallet/INTEGRATION_GUIDE.md</code></li>
          <li>• Email Template: <code className="bg-muted px-1 py-0.5 rounded">EMAIL_TEMPLATE_KOTANI.md</code></li>
        </ul>
      </div>
    </div>
  )
}
