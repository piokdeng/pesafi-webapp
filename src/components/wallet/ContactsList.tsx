'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Star, Trash2, Edit2, Plus, Send, X, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { Contact, CreateContactData, UpdateContactData } from '@/hooks/useContacts'

interface ContactsListProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  onAdd: (data: CreateContactData) => Promise<Contact | null>
  onUpdate: (id: string, data: UpdateContactData) => Promise<Contact | null>
  onDelete: (id: string) => Promise<boolean>
  onToggleFavorite: (id: string, current: boolean) => Promise<Contact | null>
  onSendTo?: (contact: Contact) => void
}

type Tab = 'all' | 'favorites' | 'recent'

export default function ContactsList({
  open,
  onOpenChange,
  contacts,
  onAdd,
  onUpdate,
  onDelete,
  onToggleFavorite,
  onSendTo,
}: ContactsListProps) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [formName, setFormName] = useState('')
  const [formWallet, setFormWallet] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const filteredContacts = (() => {
    let list = contacts

    if (activeTab === 'favorites') {
      list = list.filter(c => c.is_favorite)
    } else if (activeTab === 'recent') {
      list = list
        .filter(c => c.last_used_at)
        .sort((a, b) => new Date(b.last_used_at!).getTime() - new Date(a.last_used_at!).getTime())
        .slice(0, 10)
    }

    if (search) {
      const term = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.wallet_address?.toLowerCase().includes(term) ||
        c.phone_number?.includes(term)
      )
    }

    return list
  })()

  const resetForm = () => {
    setFormName('')
    setFormWallet('')
    setFormPhone('')
    setFormNotes('')
    setEditingContact(null)
    setShowAddForm(false)
  }

  const openEditForm = (contact: Contact) => {
    setEditingContact(contact)
    setFormName(contact.name)
    setFormWallet(contact.wallet_address || '')
    setFormPhone(contact.phone_number || '')
    setFormNotes(contact.notes || '')
    setShowAddForm(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Name is required')
      return
    }
    if (!formWallet && !formPhone) {
      toast.error('Provide a wallet address or phone number')
      return
    }

    setSaving(true)
    try {
      if (editingContact) {
        const data: UpdateContactData = {
          name: formName.trim(),
          walletAddress: formWallet || null,
          phoneNumber: formPhone || null,
          notes: formNotes || null,
        }
        const result = await onUpdate(editingContact.id, data)
        if (result) {
          toast.success('Contact updated')
          resetForm()
        }
      } else {
        const data: CreateContactData = {
          name: formName.trim(),
          ...(formWallet && { walletAddress: formWallet }),
          ...(formPhone && { phoneNumber: formPhone }),
          ...(formNotes && { notes: formNotes }),
        }
        const result = await onAdd(data)
        if (result) {
          toast.success('Contact added')
          resetForm()
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save contact')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (contact: Contact) => {
    const success = await onDelete(contact.id)
    if (success) {
      toast.success('Contact deleted')
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'recent', label: 'Recent' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contacts
          </DialogTitle>
        </DialogHeader>

        {showAddForm ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">{editingContact ? 'Edit Contact' : 'Add Contact'}</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contact name"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Wallet Address</Label>
              <Input
                value={formWallet}
                onChange={(e) => setFormWallet(e.target.value)}
                placeholder="0x..."
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Phone Number</Label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+254..."
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Add a note..."
                className="h-9"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Saving...' : editingContact ? 'Update Contact' : 'Add Contact'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="pl-9 h-9"
                />
              </div>
              <Button size="sm" className="h-9" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {search ? 'No contacts found' : activeTab === 'favorites' ? 'No favorite contacts' : 'No contacts yet'}
                  </p>
                  {!search && activeTab === 'all' && (
                    <Button variant="link" size="sm" onClick={() => setShowAddForm(true)}>
                      Add your first contact
                    </Button>
                  )}
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                      {contact.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.wallet_address
                          ? `${contact.wallet_address.slice(0, 6)}...${contact.wallet_address.slice(-4)}`
                          : contact.phone_number
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => onToggleFavorite(contact.id, contact.is_favorite)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      >
                        <Star className={`h-3.5 w-3.5 ${contact.is_favorite ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                      </button>
                      {onSendTo && (
                        <button
                          onClick={() => onSendTo(contact)}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        >
                          <Send className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={() => openEditForm(contact)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(contact)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
