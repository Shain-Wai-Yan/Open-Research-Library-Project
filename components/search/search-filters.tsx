"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import type { SearchFilters as Filters } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Clock, Star, Zap, Sparkles } from "lucide-react"

interface SearchFiltersProps {
  onFilterChange?: (filters: Filters) => void
}

export function SearchFilters({ onFilterChange }: SearchFiltersProps) {
  const [filters, setFilters] = useState<Filters>({
    openAccessOnly: false,
    sortBy: "relevance",
  })

  const updateFilter = (key: keyof Filters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const sortOptions = [
    { value: "relevance", label: "Relevance", desc: "Best match", icon: Star, color: "text-warning" },
    { value: "recent", label: "Most Recent", desc: "Latest first", icon: Clock, color: "text-info" },
    { value: "citations", label: "Most Cited", desc: "Total citations", icon: TrendingUp, color: "text-success" },
    {
      value: "citation-velocity",
      label: "Citation Velocity",
      desc: "Citations/year",
      icon: Zap,
      color: "text-primary",
    },
  ]

  return (
    <Card className="p-4 md:p-6 border-2 hover:border-primary/30 transition-all duration-300 animate-scale-in">
      <div className="mb-4 md:mb-6 pb-4 md:pb-6 border-b">
        <Label className="text-sm md:text-base font-semibold mb-3 block">Sort By</Label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          {sortOptions.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.value}
                onClick={() => updateFilter("sortBy", option.value)}
                className={`p-3 md:p-4 rounded-lg md:rounded-xl border-2 text-left transition-all duration-300 hover-lift group ${
                  filters.sortBy === option.value
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-lg"
                    : "border-border hover:border-primary/50 bg-card"
                }`}
              >
                <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                  <Icon
                    className={`w-3.5 md:w-4 h-3.5 md:h-4 shrink-0 ${filters.sortBy === option.value ? option.color : "text-muted-foreground"} group-hover:${option.color} transition-colors`}
                  />
                  <div className="font-medium text-xs md:text-sm leading-tight">{option.label}</div>
                </div>
                <div className="text-xs text-muted-foreground hidden sm:block">{option.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs md:text-sm">
            <span className="w-2 h-2 rounded-full bg-chart-1"></span>
            Author Name
          </Label>
          <Input
            placeholder="e.g., Hinton"
            onChange={(e) => updateFilter("author", e.target.value || undefined)}
            className="border-2 hover:border-primary/50 focus:border-primary transition-all duration-300 h-9 md:h-10 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs md:text-sm">
            <span className="w-2 h-2 rounded-full bg-chart-2"></span>
            Publication Venue
          </Label>
          <Input
            placeholder="e.g., Nature"
            onChange={(e) => updateFilter("venue", e.target.value || undefined)}
            className="border-2 hover:border-primary/50 focus:border-primary transition-all duration-300 h-9 md:h-10 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs md:text-sm">
            <span className="w-2 h-2 rounded-full bg-chart-3"></span>
            Year Range
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="From"
              onChange={(e) => updateFilter("yearFrom", Number.parseInt(e.target.value) || undefined)}
              className="border-2 hover:border-primary/50 focus:border-primary transition-all duration-300 h-9 md:h-10 text-sm"
            />
            <Input
              type="number"
              placeholder="To"
              onChange={(e) => updateFilter("yearTo", Number.parseInt(e.target.value) || undefined)}
              className="border-2 hover:border-primary/50 focus:border-primary transition-all duration-300 h-9 md:h-10 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs md:text-sm">
            <span className="w-2 h-2 rounded-full bg-chart-4"></span>
            Minimum Citations
          </Label>
          <Input
            type="number"
            placeholder="e.g., 10"
            onChange={(e) => updateFilter("minCitations", Number.parseInt(e.target.value) || undefined)}
            className="border-2 hover:border-primary/50 focus:border-primary transition-all duration-300 h-9 md:h-10 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t">
        <div className="flex flex-wrap items-center gap-2">
          <Checkbox
            id="open-access"
            checked={filters.openAccessOnly}
            onCheckedChange={(checked) => updateFilter("openAccessOnly", checked)}
            className="border-2"
          />
          <Label htmlFor="open-access" className="cursor-pointer text-sm">
            Open access only
          </Label>
          <Badge variant="secondary" className="gradient-emerald text-white border-0 text-xs">
            PDF Available
          </Badge>
        </div>
      </div>

      <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t">
        <p className="text-xs md:text-sm font-medium mb-3 flex items-center gap-2">
          <Sparkles className="w-3 md:w-4 h-3 md:h-4 text-primary" />
          Advanced Search Syntax
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <code className="bg-gradient-to-r from-chart-1 to-chart-2 text-white px-1.5 md:px-2 py-0.5 md:py-1 rounded font-mono text-xs">
              AND OR NOT
            </code>
            <span className="text-muted-foreground text-xs">Boolean operators</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-gradient-to-r from-chart-2 to-chart-3 text-white px-1.5 md:px-2 py-0.5 md:py-1 rounded font-mono text-xs">
              "exact phrase"
            </code>
            <span className="text-muted-foreground text-xs">Phrase search</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-gradient-to-r from-chart-3 to-chart-4 text-white px-1.5 md:px-2 py-0.5 md:py-1 rounded font-mono text-xs">
              title:keyword
            </code>
            <span className="text-muted-foreground text-xs">Search in title</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-gradient-to-r from-chart-4 to-chart-5 text-white px-1.5 md:px-2 py-0.5 md:py-1 rounded font-mono text-xs">
              author:name
            </code>
            <span className="text-muted-foreground text-xs">Search by author</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
