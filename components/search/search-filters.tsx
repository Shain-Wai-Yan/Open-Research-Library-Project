"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import type { SearchFilters as Filters } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

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

  return (
    <Card className="p-6">
      <div className="mb-6 pb-6 border-b">
        <Label className="text-base font-semibold mb-3 block">Sort By</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { value: "relevance", label: "Relevance", desc: "Best match" },
            { value: "recent", label: "Most Recent", desc: "Latest first" },
            { value: "citations", label: "Most Cited", desc: "Total citations" },
            { value: "citation-velocity", label: "Citation Velocity", desc: "Citations/year" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => updateFilter("sortBy", option.value)}
              className={`p-3 rounded-lg border text-left transition-all ${
                filters.sortBy === option.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50 bg-transparent"
              }`}
            >
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          <Label>Author Name</Label>
          <Input placeholder="e.g., Hinton" onChange={(e) => updateFilter("author", e.target.value || undefined)} />
        </div>

        <div className="space-y-2">
          <Label>Publication Venue</Label>
          <Input placeholder="e.g., Nature" onChange={(e) => updateFilter("venue", e.target.value || undefined)} />
        </div>

        <div className="space-y-2">
          <Label>Year Range</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="From"
              onChange={(e) => updateFilter("yearFrom", Number.parseInt(e.target.value) || undefined)}
            />
            <Input
              type="number"
              placeholder="To"
              onChange={(e) => updateFilter("yearTo", Number.parseInt(e.target.value) || undefined)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Minimum Citations</Label>
          <Input
            type="number"
            placeholder="e.g., 10"
            onChange={(e) => updateFilter("minCitations", Number.parseInt(e.target.value) || undefined)}
          />
        </div>
      </div>

      <div className="mt-6 pt-6 border-t">
        <div className="flex items-center gap-2">
          <Checkbox
            id="open-access"
            checked={filters.openAccessOnly}
            onCheckedChange={(checked) => updateFilter("openAccessOnly", checked)}
          />
          <Label htmlFor="open-access" className="cursor-pointer">
            Open access only
          </Label>
          <Badge variant="secondary" className="ml-2 bg-transparent">
            PDF Available
          </Badge>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t">
        <p className="text-sm text-muted-foreground mb-2 font-medium">Advanced Search Syntax:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <code className="bg-muted px-1.5 py-0.5 rounded">AND OR NOT</code> Boolean operators
          </div>
          <div>
            <code className="bg-muted px-1.5 py-0.5 rounded">"exact phrase"</code> Phrase search
          </div>
          <div>
            <code className="bg-muted px-1.5 py-0.5 rounded">title:keyword</code> Search in title
          </div>
          <div>
            <code className="bg-muted px-1.5 py-0.5 rounded">author:name</code> Search by author
          </div>
        </div>
      </div>
    </Card>
  )
}
