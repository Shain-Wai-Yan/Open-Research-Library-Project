"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { SearchBar } from "@/components/search/search-bar"
import { PaperCard } from "@/components/papers/paper-card"
import { searchPapers } from "@/lib/api-client"
import type { SearchFilters } from "@/lib/types"
import type { SearchResult } from "@/lib/api-services"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const [searchResult, setSearchResult] = useState<SearchResult>({
    papers: [],
    totalResults: 0,
    currentPage: 1,
    hasMore: false,
  })
  const [filters, setFilters] = useState<SearchFilters>({})
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentQuery, setCurrentQuery] = useState("")

  const handleSearch = async (query: string) => {
    setCurrentQuery(query)
    setIsSearching(true)
    const results = await searchPapers(query, filters, 1, 50)
    setSearchResult(results)
    setIsSearching(false)
  }

  const handleLoadMore = async () => {
    if (!searchResult.hasMore || isLoadingMore) return

    setIsLoadingMore(true)
    const nextPage = searchResult.currentPage + 1
    const newResults = await searchPapers(currentQuery, filters, nextPage, 50)

    setSearchResult({
      ...newResults,
      papers: [...searchResult.papers, ...newResults.papers],
    })
    setIsLoadingMore(false)
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
          ) : searchResult.papers.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    Showing {searchResult.papers.length.toLocaleString()} of{" "}
                    {searchResult.totalResults.toLocaleString()} results
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Page {searchResult.currentPage} • Aggregated from 5 research databases
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {searchResult.papers.map((paper) => (
                  <PaperCard key={paper.id} paper={paper} />
                ))}
              </div>

              {searchResult.hasMore && (
                <div className="flex justify-center pt-8">
                  <Button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    size="lg"
                    variant="outline"
                    className="min-w-48 bg-transparent"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading more papers...
                      </>
                    ) : (
                      `Load more results (${(searchResult.totalResults - searchResult.papers.length).toLocaleString()} remaining)`
                    )}
                  </Button>
                </div>
              )}

              {/* End indicator */}
              {!searchResult.hasMore && searchResult.papers.length > 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>You've reached the end of the results</p>
                </div>
              )}
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
