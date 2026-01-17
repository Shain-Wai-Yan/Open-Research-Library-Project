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
    <Card className="p-6 border-2 hover:border-primary/30 transition-all duration-300 animate-scale-in">
      <div className="mb-6 pb-6 border-b">
        <Label className="text-base font-semibold mb-3 block">Sort By</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sortOptions.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.value}
                onClick={() => updateFilter("sortBy", option.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-300 hover-lift group ${
                  filters.sortBy === option.value
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-lg"
                    : "border-border hover:border-primary/50 bg-card"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    className={`w-4 h-4 ${filters.sortBy === option.value ? option.color : "text-muted-foreground"} group-hover:${option.color} transition-colors`}
                  />
                  <div className="font-medium text-sm">{option.label}</div>
                </div>
                <div className="text-xs text-muted-foreground">{option.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-chart-1"></span>
            Author Name
          </Label>
          <Input
            placeholder="e.g., Hinton"
            onChange={(e) => updateFilter("author", e.target.value || undefined)}
            className="border-2 hover:border-primary/50 focus:border-primary transition-all duration-300"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-chart-2"></span>
            Publication Venue
          </Label>
          <Input
            placeholder="e.g., Nature"
            onChange={(e) => updateFilter("venue", e.target.value || undefined)}
            className="border-2 hover:border-primary/50 focus:border-primary transition-all duration-300"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-chart-3"></span>
            Year Range
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="From"
              onChange={(e) => updateFilter("yearFrom", Number.parseInt(e.target.value) || undefined)}
              className="border-2 hover:border-primary/50 focus:border-primary transition-all duration-300"
            />
            <Input
              type="number"
              placeholder="To"
              onChange={(e) => updateFilter("yearTo", Number.parseInt(e.target.value) || undefined)}
              className="border-2 hover:border-primary/50 focus:border-primary transition-all duration-300"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-chart-4"></span>
            Minimum Citations
          </Label>
          <Input
            type="number"
            placeholder="e.g., 10"
            onChange={(e) => updateFilter("minCitations", Number.parseInt(e.target.value) || undefined)}
            className="border-2 hover:border-primary/50 focus:border-primary transition-all duration-300"
          />
        </div>
      </div>

      <div className="mt-6 pt-6 border-t">
        <div className="flex items-center gap-2">
          <Checkbox
            id="open-access"
            checked={filters.openAccessOnly}
            onCheckedChange={(checked) => updateFilter("openAccessOnly", checked)}
            className="border-2"
          />
          <Label htmlFor="open-access" className="cursor-pointer">
            Open access only
          </Label>
          <Badge variant="secondary" className="ml-2 gradient-emerald text-white border-0">
            PDF Available
          </Badge>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t">
        <p className="text-sm font-medium mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Advanced Search Syntax
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <code className="bg-gradient-to-r from-chart-1 to-chart-2 text-white px-2 py-1 rounded font-mono">
              AND OR NOT
            </code>
            <span className="text-muted-foreground">Boolean operators</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-gradient-to-r from-chart-2 to-chart-3 text-white px-2 py-1 rounded font-mono">
              "exact phrase"
            </code>
            <span className="text-muted-foreground">Phrase search</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-gradient-to-r from-chart-3 to-chart-4 text-white px-2 py-1 rounded font-mono">
              title:keyword
            </code>
            <span className="text-muted-foreground">Search in title</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-gradient-to-r from-chart-4 to-chart-5 text-white px-2 py-1 rounded font-mono">
              author:name
            </code>
            <span className="text-muted-foreground">Search by author</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
