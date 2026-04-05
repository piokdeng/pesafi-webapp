'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export interface TxFilters {
  type: string | null
  search: string
}

interface TransactionFilterProps {
  onFilterChange: (filters: TxFilters) => void
}

const TYPE_OPTIONS = [
  { value: null, label: 'All' },
  { value: 'send', label: 'Sent' },
  { value: 'receive', label: 'Received' },
  { value: 'deposit', label: 'Deposited' },
  { value: 'withdrawal', label: 'Withdrawn' },
] as const

export default function TransactionFilter({ onFilterChange }: TransactionFilterProps) {
  const [activeType, setActiveType] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const debounceRef = useRef<NodeJS.Timeout>(null)
  const onFilterChangeRef = useRef(onFilterChange)
  onFilterChangeRef.current = onFilterChange
  const mountedRef = useRef(false)

  useEffect(() => {
    // Skip the initial mount — only fire on actual user interaction
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      onFilterChangeRef.current({ type: activeType, search: searchValue })
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchValue, activeType])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search by address..."
          className="pl-9 h-9 text-sm"
        />
      </div>
      <div className="flex gap-1 flex-wrap">
        {TYPE_OPTIONS.map(opt => (
          <button
            key={opt.label}
            onClick={() => setActiveType(opt.value)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              activeType === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
