'use client'

/**
 * Auto Wallet Hook
 *
 * Automatically fetches the user's wallet from database.
 * NO manual wallet connection needed for deposits/withdrawals.
 *
 * Wallets are auto-created on signup and stored server-side.
 * Users never see or interact with wallet connections.
 *
 * Perfect for users who don't understand crypto wallets.
 */

import { useEffect, useState, useCallback } from 'react'
import { useSupabaseAuth } from '@/lib/supabase-auth-client'
import { supabaseAuthClient } from '@/lib/supabase-auth-client'

interface WalletData {
  address: string
  usdc_balance: string
  local_currency: string
  is_active: boolean
  created_at: string
}

const WALLET_FETCH_TIMEOUT_MS = 25_000

export function useAutoWallet(walletType?: string) {
  const { user, loading: authLoading } = useSupabaseAuth()

  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch wallet from database
   */
  const userId = user?.id
  const fetchWallet = useCallback(async () => {
    if (authLoading) {
      return null
    }

    if (!userId) {
      setIsLoading(false)
      return null
    }

    try {
      console.log('[useAutoWallet] Fetching wallet for user:', userId)
      setIsLoading(true)
      setError(null)

      const { data: { session } } = await supabaseAuthClient.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No session token available')
      }

      const walletUrl = walletType
        ? `/api/user/wallet?walletType=${walletType}`
        : '/api/user/wallet';

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), WALLET_FETCH_TIMEOUT_MS)

      const response = await fetch(walletUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId))

      if (response.ok) {
        const data = await response.json()
        console.log('[useAutoWallet] ✅ Wallet fetched:', data.address)
        setWalletData(data)
        return data
      } else if (response.status === 404) {
        console.log('[useAutoWallet] No wallet found - creating one automatically')

        const createController = new AbortController()
        const createTimeoutId = setTimeout(
          () => createController.abort(),
          WALLET_FETCH_TIMEOUT_MS
        )
        const createResponse = await fetch('/api/auth/signup/create-wallet', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          signal: createController.signal,
        }).finally(() => clearTimeout(createTimeoutId))

        if (createResponse.ok) {
          console.log('[useAutoWallet] Wallet created, fetching again...')
          const retryController = new AbortController()
          const retryTimeoutId = setTimeout(
            () => retryController.abort(),
            WALLET_FETCH_TIMEOUT_MS
          )
          const retryResponse = await fetch(walletUrl, {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            signal: retryController.signal,
          }).finally(() => clearTimeout(retryTimeoutId))

          if (retryResponse.ok) {
            const data = await retryResponse.json()
            console.log('[useAutoWallet] ✅ Wallet created and fetched:', data.address)
            setWalletData(data)
            return data
          }
        } else {
          console.error('[useAutoWallet] Failed to create wallet')
        }

        setWalletData(null)
        return null
      } else {
        throw new Error('Failed to fetch wallet')
      }
    } catch (err: any) {
      console.error('[useAutoWallet] Error fetching wallet:', err)
      const msg =
        err?.name === 'AbortError'
          ? 'Wallet request timed out. Check your network and try again.'
          : err.message
      setError(msg)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [userId, walletType, authLoading])

  /**
   * Refresh wallet balance
   */
  const refreshBalance = useCallback(async () => {
    return await fetchWallet()
  }, [fetchWallet])

  useEffect(() => {
    if (authLoading) return
    fetchWallet()
  }, [fetchWallet, authLoading])

  // DO NOT auto-record wagmi connections - we use server-generated wallets only

  return {
    // Wallet data from database
    walletAddress: walletData?.address || null,
    balance: walletData ? parseFloat(walletData.usdc_balance) : 0,
    localCurrency: walletData?.local_currency || 'KES',

    // State
    isLoading,
    error,
    hasWallet: !!walletData,

    // Actions
    refreshBalance,

    // Raw data
    walletData,
  }
}
