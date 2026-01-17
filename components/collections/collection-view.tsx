"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { getSavedPapers } from "@/lib/api-client"
import type { SavedPaper } from "@/lib/api-client"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, ExternalLink } from "lucide-react"

interface CollectionViewProps {
  collectionId: string
  collectionName: string
}

export function CollectionView({ collectionId, collectionName }: CollectionViewProps) {
  const [papers, setPapers] = useState<SavedPaper[]>([])
  const [filteredPapers, setFilteredPapers] = useState<SavedPaper[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadPapers()
  }, [collectionId])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPapers(papers)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = papers.filter((paper) => {
        const titleMatch = paper.title.toLowerCase().includes(query)
        const authorsMatch = paper.authors?.some((author) => author.name.toLowerCase().includes(query)) || false
        return titleMatch || authorsMatch
      })
      setFilteredPapers(filtered)
    }
  }, [searchQuery, papers])

  const loadPapers = async () => {
    setIsLoading(true)
    try {
      const data = await getSavedPapers(collectionId)
      setPapers(data)
      setFilteredPapers(data)
    } catch (error) {
      console.error("[CollectionView] Error loading papers:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading papers...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold mb-2">{collectionName}</h2>
        <p className="text-muted-foreground">
          Showing {filteredPapers.length} of {papers.length} saved papers
        </p>
      </div>

      {papers.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {filteredPapers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {papers.length === 0
              ? "No papers in this collection yet. Save papers from search results to add them here."
              : "No papers match your search query."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPapers.map((paper) => (
            <Card key={paper.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Link
                      href={`/paper/${encodeURIComponent(paper.paperId)}`}
                      className="text-lg font-serif font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {paper.title}
                    </Link>
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      {paper.authors && paper.authors.length > 0 && (
                        <span>{paper.authors.map((a) => a.name).join(", ")}</span>
                      )}
                      {paper.year && (
                        <>
                          <span>•</span>
                          <span>{paper.year}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {paper.abstract && <p className="text-sm text-muted-foreground line-clamp-2">{paper.abstract}</p>}

                <div className="flex flex-wrap items-center gap-2">
                  {paper.citations !== undefined && paper.citations !== null && (
                    <Badge variant="secondary" className="gradient-teal text-white border-0">
                      {paper.citations} citations
                    </Badge>
                  )}
                  {paper.source && (
                    <Badge variant="outline" className="capitalize border-chart-4 text-chart-4">
                      {paper.source}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  {paper.pdfUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="border-2 hover:border-chart-1 hover:text-chart-1 transition-all bg-transparent"
                    >
                      <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="w-4 h-4 mr-2" />
                        PDF
                      </a>
                    </Button>
                  )}
                  {paper.doi && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="border-2 hover:border-chart-2 hover:text-chart-2 transition-all bg-transparent"
                    >
                      <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        DOI
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
