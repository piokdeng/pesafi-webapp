'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSupabaseAuth } from '@/lib/supabase-auth-client'
import { supabaseAuthClient } from '@/lib/supabase-auth-client'

export interface Contact {
  id: string
  user_id: string
  name: string
  wallet_address: string | null
  phone_number: string | null
  is_favorite: boolean
  source: 'manual' | 'transaction'
  last_used_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateContactData {
  name: string
  walletAddress?: string
  phoneNumber?: string
  isFavorite?: boolean
  notes?: string
}

export interface UpdateContactData {
  name?: string
  walletAddress?: string | null
  phoneNumber?: string | null
  isFavorite?: boolean
  notes?: string | null
}

export function useContacts() {
  const { user } = useSupabaseAuth()
  const userId = user?.id

  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getAuthHeaders = useCallback(async (): Promise<HeadersInit | null> => {
    const { data: { session } } = await supabaseAuthClient.auth.getSession()
    if (!session?.access_token) return null
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }
  }, [])

  const fetchContacts = useCallback(async (search?: string) => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const headers = await getAuthHeaders()
      if (!headers) throw new Error('No session token available')

      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await fetch(`/api/contacts?${params.toString()}`, { headers })

      if (!response.ok) {
        throw new Error('Failed to fetch contacts')
      }

      const data = await response.json()
      setContacts(data)
    } catch (err: any) {
      console.error('[useContacts] Error fetching contacts:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [userId, getAuthHeaders])

  const addContact = useCallback(async (data: CreateContactData): Promise<Contact | null> => {
    try {
      setError(null)
      const headers = await getAuthHeaders()
      if (!headers) throw new Error('No session token available')

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to create contact')
      }

      const contact = await response.json()
      // Refresh to get proper ordering
      await fetchContacts()
      return contact
    } catch (err: any) {
      console.error('[useContacts] Error adding contact:', err)
      setError(err.message)
      return null
    }
  }, [getAuthHeaders, fetchContacts])

  const updateContact = useCallback(async (id: string, data: UpdateContactData): Promise<Contact | null> => {
    try {
      setError(null)
      const headers = await getAuthHeaders()
      if (!headers) throw new Error('No session token available')

      const response = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to update contact')
      }

      const updated = await response.json()
      setContacts(prev => prev.map(c => c.id === id ? updated : c))
      return updated
    } catch (err: any) {
      console.error('[useContacts] Error updating contact:', err)
      setError(err.message)
      return null
    }
  }, [getAuthHeaders])

  const deleteContact = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null)
      const headers = await getAuthHeaders()
      if (!headers) throw new Error('No session token available')

      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
        headers,
      })

      if (!response.ok) {
        throw new Error('Failed to delete contact')
      }

      setContacts(prev => prev.filter(c => c.id !== id))
      return true
    } catch (err: any) {
      console.error('[useContacts] Error deleting contact:', err)
      setError(err.message)
      return false
    }
  }, [getAuthHeaders])

  const toggleFavorite = useCallback(async (id: string, currentValue: boolean) => {
    return updateContact(id, { isFavorite: !currentValue })
  }, [updateContact])

  // Derived data
  const recentContacts = useMemo(() => {
    return contacts
      .filter(c => c.last_used_at)
      .sort((a, b) => new Date(b.last_used_at!).getTime() - new Date(a.last_used_at!).getTime())
      .slice(0, 5)
  }, [contacts])

  const favoriteContacts = useMemo(() => {
    return contacts.filter(c => c.is_favorite)
  }, [contacts])

  // Fetch on mount
  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  return {
    contacts,
    isLoading,
    error,
    fetchContacts,
    addContact,
    updateContact,
    deleteContact,
    toggleFavorite,
    recentContacts,
    favoriteContacts,
  }
}
