"use client"

import type React from "react"

import { useState } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchFilters } from "./search-filters"

interface SearchBarProps {
  onSearch: (query: string) => void
  onFilterChange?: (filters: any) => void
}

export function SearchBar({ onSearch, onFilterChange }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across OpenAlex, Semantic Scholar, arXiv..."
            className="pl-12 h-12 text-base"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 bg-transparent"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </Button>
        <Button type="submit" className="h-12 px-8">
          Search
        </Button>
      </form>

      {showFilters && <SearchFilters onFilterChange={onFilterChange} />}
    </div>
  )
}
