"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { SearchBar } from "@/components/search/search-bar"
import { PaperCard } from "@/components/papers/paper-card"
import { searchPapers } from "@/lib/mock-api"
import type { Paper, SearchFilters } from "@/lib/types"

export default function DashboardPage() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [filters, setFilters] = useState<SearchFilters>({})
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async (query: string) => {
    setIsSearching(true)
    const results = await searchPapers(query, filters)
    setPapers(results)
    setIsSearching(false)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Header />

        <div className="p-8 max-w-7xl mx-auto">
          {/* Search Section */}
          <div className="mb-12">
            <div className="max-w-4xl mx-auto text-center mb-8">
              <h1 className="text-4xl font-serif font-bold text-foreground mb-4">Search Across Academic Sources</h1>
              <p className="text-lg text-muted-foreground">
                Unified search across OpenAlex, Semantic Scholar, and arXiv
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <SearchBar onSearch={handleSearch} onFilterChange={setFilters} />
            </div>
          </div>

          {/* Results */}
          {isSearching ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-lg bg-muted animate-shimmer" />
              ))}
            </div>
          ) : papers.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{papers.length} papers found</h2>
              </div>

              <div className="space-y-4">
                {papers.map((paper) => (
                  <PaperCard key={paper.id} paper={paper} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Start your research journey by searching for papers</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
