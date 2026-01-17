"use client"

import { useState, useEffect, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { SearchBar } from "@/components/search/search-bar"
import { PaperCard } from "@/components/papers/paper-card"
import { searchPapers } from "@/lib/api-client"
import type { SearchFilters } from "@/lib/types"
import type { SearchResult } from "@/lib/api-services"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  const [error, setError] = useState<string | null>(null)

  const prevFiltersRef = useRef<SearchFilters>({})

  useEffect(() => {
    if (JSON.stringify(filters) !== JSON.stringify(prevFiltersRef.current) && currentQuery) {
      prevFiltersRef.current = filters
      handleSearch(currentQuery)
    }
  }, [filters])

  const handleSearch = async (query: string) => {
    setCurrentQuery(query)
    setIsSearching(true)
    setError(null)

    try {
      const results = await searchPapers(query, filters, 1, 50)
      setSearchResult(results)
    } catch (err) {
      console.error("[Dashboard] Search error:", err)
      setError("Search failed. Please try again.")
      setSearchResult({
        papers: [],
        totalResults: 0,
        currentPage: 1,
        hasMore: false,
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleLoadMore = async () => {
    if (!searchResult.hasMore || isLoadingMore) return

    setIsLoadingMore(true)
    setError(null)

    try {
      const nextPage = searchResult.currentPage + 1
      const newResults = await searchPapers(currentQuery, filters, nextPage, 50)

      setSearchResult({
        ...newResults,
        papers: [...searchResult.papers, ...newResults.papers],
      })
    } catch (err) {
      console.error("[Dashboard] Load more error:", err)
      setError("Failed to load more results.")
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Header />

        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="max-w-4xl mx-auto">
              <SearchBar onSearch={handleSearch} onFilterChange={setFilters} />
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isSearching ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : searchResult.papers.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {searchResult.papers.length.toLocaleString()} of {searchResult.totalResults.toLocaleString()}{" "}
                    results
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
                        Loading...
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
