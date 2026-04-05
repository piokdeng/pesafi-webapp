'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Star } from 'lucide-react'
import type { Contact } from '@/hooks/useContacts'

interface ContactPickerProps {
  mode: 'wallet' | 'mobile'
  contacts: Contact[]
  onSelectContact: (contact: Contact) => void
}

export default function ContactPicker({ mode, contacts, onSelectContact }: ContactPickerProps) {
  const [search, setSearch] = useState('')

  const filteredContacts = useMemo(() => {
    let filtered = contacts.filter(c =>
      mode === 'wallet' ? c.wallet_address : c.phone_number
    )

    if (search) {
      const term = search.toLowerCase()
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.wallet_address?.toLowerCase().includes(term) ||
        c.phone_number?.includes(term)
      )
    }

    return filtered.slice(0, 5)
  }, [contacts, mode, search])

  if (contacts.filter(c => mode === 'wallet' ? c.wallet_address : c.phone_number).length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">No saved contacts yet</p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="pl-9 h-9 text-sm"
        />
      </div>
      {filteredContacts.length > 0 && (
        <div className="space-y-1 max-h-36 overflow-y-auto">
          {filteredContacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => onSelectContact(contact)}
              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/70 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                {contact.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium truncate">{contact.name}</p>
                  {contact.is_favorite && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {mode === 'wallet'
                    ? `${contact.wallet_address?.slice(0, 6)}...${contact.wallet_address?.slice(-4)}`
                    : contact.phone_number
                  }
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      {search && filteredContacts.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">No contacts found</p>
      )}
    </div>
  )
}
