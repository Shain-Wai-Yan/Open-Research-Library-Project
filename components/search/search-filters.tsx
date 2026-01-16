"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import type { SearchFilters as Filters } from "@/lib/types"

interface SearchFiltersProps {
  onFilterChange?: (filters: Filters) => void
}

export function SearchFilters({ onFilterChange }: SearchFiltersProps) {
  const [filters, setFilters] = useState<Filters>({
    openAccessOnly: false,
  })

  const updateFilter = (key: keyof Filters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  return (
    <Card className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>Year Range</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="From"
              onChange={(e) => updateFilter("yearFrom", Number.parseInt(e.target.value))}
            />
            <Input
              type="number"
              placeholder="To"
              onChange={(e) => updateFilter("yearTo", Number.parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Methodology</Label>
          <Select onValueChange={(value) => updateFilter("methodology", [value])}>
            <SelectTrigger>
              <SelectValue placeholder="Any methodology" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="experiment">Experiment</SelectItem>
              <SelectItem value="survey">Survey</SelectItem>
              <SelectItem value="case-study">Case Study</SelectItem>
              <SelectItem value="systematic-review">Systematic Review</SelectItem>
              <SelectItem value="meta-analysis">Meta-Analysis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Minimum Citations</Label>
          <Input
            type="number"
            placeholder="e.g., 10"
            onChange={(e) => updateFilter("minCitations", Number.parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Checkbox
          id="open-access"
          checked={filters.openAccessOnly}
          onCheckedChange={(checked) => updateFilter("openAccessOnly", checked)}
        />
        <Label htmlFor="open-access" className="cursor-pointer">
          Open access only
        </Label>
      </div>
    </Card>
  )
}
