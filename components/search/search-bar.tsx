"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Search, SlidersHorizontal, Sparkles, Zap } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchFilters } from "./search-filters"
import { parseQuery } from "@/lib/query-parser"
import { Badge } from "@/components/ui/badge"

interface SearchBarProps {
  onSearch: (query: string) => void
  onFilterChange?: (filters: any) => void
}

export function SearchBar({ onSearch, onFilterChange }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const debounceRef = useRef<NodeJS.Timeout>()

  const parsedQuery = parseQuery(query)
  const isAdvanced = parsedQuery.isAdvanced

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    onSearch(query)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className={`relative flex-1 transition-all duration-300 ${isFocused ? "animate-pulse-glow" : ""}`}>
          <Search
            className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
              isFocused ? "text-primary" : "text-muted-foreground"
            }`}
          />
          {isAdvanced && (
            <Badge
              variant="secondary"
              className="absolute right-4 top-1/2 -translate-y-1/2 gap-1 gradient-emerald text-white border-0 animate-scale-in"
            >
              <Sparkles className="w-3 h-3" />
              Advanced
            </Badge>
          )}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder='Try: "machine learning" AND privacy, or title:neural author:Hinton'
            className="pl-12 pr-28 h-14 text-base border-2 transition-all duration-300 hover-glow focus:border-primary"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={`h-14 w-14 transition-all duration-300 hover-lift ${
            showFilters ? "gradient-teal text-white border-0" : ""
          }`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </Button>
        <Button
          type="submit"
          className="h-14 px-8 gradient-green hover:opacity-90 transition-all duration-300 hover-lift group"
        >
          <Zap className="w-5 h-5 mr-2 group-hover:animate-pulse" />
          Search
        </Button>
      </form>

      {showFilters && (
        <div className="animate-slide-up">
          <SearchFilters onFilterChange={onFilterChange} />
        </div>
      )}
    </div>
  )
}
