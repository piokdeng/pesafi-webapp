"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestMoonPayPage() {
  const [moonPayBuySdk, setMoonPayBuySdk] = useState<any>(null);
  const [moonPaySellSdk, setMoonPaySellSdk] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeMoonPay = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamic import to avoid SSR issues
        const { loadMoonPay } = await import('@moonpay/moonpay-js');
        const moonPay = await loadMoonPay();
        
        if (!moonPay) {
          throw new Error('Failed to load MoonPay SDK');
        }
        
        // Initialize Buy SDK (On-ramp)
        const buySdk = moonPay({
          flow: 'buy',
          environment: 'sandbox', // Use sandbox for testing
          variant: 'overlay',
          params: {
            apiKey: process.env.NEXT_PUBLIC_MOONPAY_KEY || 'pk_test_NfXox2Ud6ZjqIFwF1CkvgubzbG1voCZ',
            theme: 'dark',
            baseCurrencyCode: 'usd',
            baseCurrencyAmount: '100',
            defaultCurrencyCode: 'usdc', // Changed to USDC for PesaFi
            walletAddress: '0x742d35Cc6634C0532925a3b8D0C0E1c4C5C5C5C5', // Test wallet address
            email: 'test@pesafi.ai'
          }
        });

        // Initialize Sell SDK (Off-ramp)
        const sellSdk = moonPay({
          flow: 'sell',
          environment: 'sandbox', // Use sandbox for testing
          variant: 'overlay',
          params: {
            apiKey: process.env.NEXT_PUBLIC_MOONPAY_KEY || 'pk_test_NfXox2Ud6ZjqIFwF1CkvgubzbG1voCZ',
            theme: 'dark',
            baseCurrencyCode: 'usd',
            baseCurrencyAmount: '100',
            defaultCurrencyCode: 'usdc', // Changed to USDC for PesaFi
            walletAddress: '0x742d35Cc6634C0532925a3b8D0C0E1c4C5C5C5C5', // Test wallet address
            email: 'test@pesafi.ai'
          }
        });

        setMoonPayBuySdk(buySdk);
        setMoonPaySellSdk(sellSdk);
        setIsInitialized(true);
        console.log('MoonPay SDK initialized successfully');
      } catch (err) {
        console.error('Error initializing MoonPay:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize MoonPay SDK');
      } finally {
        setIsLoading(false);
      }
    };

    initializeMoonPay();
  }, []);

  const showBuyWidget = () => {
    if (!moonPayBuySdk) {
      setError('MoonPay Buy SDK not initialized');
      return;
    }

    try {
      moonPayBuySdk.show();
      console.log('MoonPay Buy widget shown');
    } catch (err) {
      console.error('Error showing MoonPay Buy widget:', err);
      setError(err instanceof Error ? err.message : 'Failed to show MoonPay Buy widget');
    }
  };

  const showSellWidget = () => {
    if (!moonPaySellSdk) {
      setError('MoonPay Sell SDK not initialized');
      return;
    }

    try {
      moonPaySellSdk.show();
      console.log('MoonPay Sell widget shown');
    } catch (err) {
      console.error('Error showing MoonPay Sell widget:', err);
      setError(err instanceof Error ? err.message : 'Failed to show MoonPay Sell widget');
    }
  };

  const hideWidget = () => {
    try {
      if (moonPayBuySdk) {
        moonPayBuySdk.hide();
        console.log('MoonPay Buy widget hidden');
      }
      if (moonPaySellSdk) {
        moonPaySellSdk.hide();
        console.log('MoonPay Sell widget hidden');
      }
    } catch (err) {
      console.error('Error hiding MoonPay widget:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">MoonPay Integration Test</h1>
          <p className="text-muted-foreground">
            Test MoonPay widget integration for PesaFi deposit functionality
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Integration Status</CardTitle>
              <CardDescription>Current MoonPay SDK status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm">
                  SDK: {isInitialized ? 'Initialized' : 'Not Initialized'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-yellow-500' : 'bg-gray-500'}`} />
                <span className="text-sm">
                  Loading: {isLoading ? 'Yes' : 'No'}
                </span>
              </div>

              <div className="text-sm">
                <strong>API Key:</strong> {process.env.NEXT_PUBLIC_MOONPAY_KEY ? `Set (${process.env.NEXT_PUBLIC_MOONPAY_KEY.substring(0, 20)}...)` : 'Not Set'}
              </div>

              <div className="text-sm">
                <strong>Environment:</strong> Sandbox (Test)
              </div>
            </CardContent>
          </Card>

          {/* Controls Card */}
          <Card>
            <CardHeader>
              <CardTitle>Widget Controls</CardTitle>
              <CardDescription>Test MoonPay widget functionality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={showBuyWidget} 
                disabled={!isInitialized || isLoading}
                className="w-full bg-green-600 hover:bg-green-500"
              >
                {isLoading ? 'Loading...' : 'Show Buy Widget (On-ramp)'}
              </Button>

              <Button 
                onClick={showSellWidget} 
                disabled={!isInitialized || isLoading}
                className="w-full bg-red-600 hover:bg-red-500"
              >
                {isLoading ? 'Loading...' : 'Show Sell Widget (Off-ramp)'}
              </Button>

              <Button 
                onClick={hideWidget} 
                disabled={!isInitialized || isLoading}
                variant="outline"
                className="w-full"
              >
                Hide All Widgets
              </Button>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuration Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Current MoonPay widget settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Widget Settings</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><strong>Buy Flow:</strong> On-ramp (Fiat → Crypto)</li>
                    <li><strong>Sell Flow:</strong> Off-ramp (Crypto → Fiat)</li>
                    <li><strong>Environment:</strong> Sandbox</li>
                    <li><strong>Variant:</strong> Overlay</li>
                    <li><strong>Theme:</strong> Dark</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Currency Settings</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><strong>Base Currency:</strong> USD</li>
                    <li><strong>Base Amount:</strong> $100</li>
                    <li><strong>Default Crypto:</strong> USDC</li>
                    <li><strong>Wallet:</strong> Test Address</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Test Instructions</CardTitle>
              <CardDescription>How to test the MoonPay integration</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Click "Show Buy Widget" to test on-ramp (fiat → crypto)</li>
                <li>Click "Show Sell Widget" to test off-ramp (crypto → fiat)</li>
                <li>Complete test transactions using MoonPay's test cards</li>
                <li>Verify transactions appear in your MoonPay dashboard</li>
                <li>Check that both on-ramp and off-ramp integrations work</li>
                <li>Once verified, you can switch to production environment</li>
              </ol>
              
              <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-md">
                <h4 className="font-semibold text-zinc-800 mb-2">Test Card Details</h4>
                <ul className="text-sm text-zinc-700 space-y-1">
                  <li><strong>Card Number:</strong> 4000 0231 0460 0000</li>
                  <li><strong>Expiry:</strong> Any future date</li>
                  <li><strong>CVV:</strong> Any 3 digits</li>
                  <li><strong>Name:</strong> Any name</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
