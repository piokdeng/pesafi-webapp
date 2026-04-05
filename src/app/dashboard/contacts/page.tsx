'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useContacts } from '@/hooks/useContacts'
import type { Contact, CreateContactData, UpdateContactData } from '@/hooks/useContacts'
import { toast } from 'sonner'
import { Search, Star, Trash2, Edit2, Plus, Users, X, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Tab = 'all' | 'favorites' | 'recent'

function ContactsPageInner() {
  const searchParams = useSearchParams()
  const {
    contacts,
    isLoading,
    addContact,
    updateContact,
    deleteContact,
    toggleFavorite,
  } = useContacts()

  const [search, setSearch] = useState('')

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearch(q)
  }, [searchParams])
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
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
    setDialogOpen(false)
  }

  const openAddDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact)
    setFormName(contact.name)
    setFormWallet(contact.wallet_address || '')
    setFormPhone(contact.phone_number || '')
    setFormNotes(contact.notes || '')
    setDialogOpen(true)
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
        const result = await updateContact(editingContact.id, data)
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
        const result = await addContact(data)
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
    const success = await deleteContact(contact.id)
    if (success) {
      toast.success('Contact deleted')
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'recent', label: 'Recent' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to Dashboard
        </Link>
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-3xl font-bold">Contacts</h1>
            <p className="text-muted-foreground">Manage your saved contacts for quick transfers</p>
          </div>
          <Button onClick={openAddDialog} className="bg-green-600 hover:bg-green-500">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              {search ? 'No contacts found' : activeTab === 'favorites' ? 'No favorite contacts' : 'No contacts yet'}
            </p>
            {!search && activeTab === 'all' && (
              <Button variant="link" onClick={openAddDialog}>
                Add your first contact
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredContacts.map(contact => (
            <Card key={contact.id} className="py-0 gap-0">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                  {contact.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{contact.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {contact.wallet_address
                      ? `${contact.wallet_address.slice(0, 6)}...${contact.wallet_address.slice(-4)}`
                      : contact.phone_number
                    }
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => toggleFavorite(contact.id, contact.is_favorite)}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <Star className={`h-4 w-4 ${contact.is_favorite ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                  </button>
                  <button
                    onClick={() => openEditDialog(contact)}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(contact)}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Contact Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contact name"
              />
            </div>
            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <Input
                value={formWallet}
                onChange={(e) => setFormWallet(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+254..."
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Add a note..."
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-green-600 hover:bg-green-500">
              {saving ? 'Saving...' : editingContact ? 'Update Contact' : 'Add Contact'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ContactsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[40vh] items-center justify-center px-4 py-16 text-muted-foreground">
          Loading contacts…
        </div>
      }
    >
      <ContactsPageInner />
    </Suspense>
  )
}
