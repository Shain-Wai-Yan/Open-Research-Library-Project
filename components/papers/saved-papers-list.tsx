"use client"

import { useState, useEffect } from "react"
import { Loader2, Filter, Search, Trash2 } from "lucide-react"
import { PaperCard } from "@/components/papers/paper-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSavedPapers, getCollections, deleteSavedPaper } from "@/lib/api-client"
import type { SavedPaper } from "@/lib/storage-adapter"
import type { Paper, Collection } from "@/lib/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function SavedPapersList() {
  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCollection, setSelectedCollection] = useState<string>("all")
  const [paperToDelete, setPaperToDelete] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [papers, cols] = await Promise.all([getSavedPapers(), getCollections()])
      setSavedPapers(papers)
      setCollections(cols)
    } catch (error) {
      console.error("[SavedPapersList] Failed to load data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (paperId: string) => {
    try {
      await deleteSavedPaper(paperId)
      setSavedPapers((prev) => prev.filter((p) => p.id !== paperId))
      setPaperToDelete(null)

      // Show success toast
      const toast = document.createElement("div")
      toast.className = "fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50"
      toast.textContent = "Paper removed successfully!"
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 3000)
    } catch (error) {
      console.error("[SavedPapersList] Failed to delete paper:", error)
      alert("Failed to delete paper. Please try again.")
    }
  }

  // Convert SavedPaper to Paper format for PaperCard
  const convertToPaper = (savedPaper: SavedPaper): Paper => ({
    id: savedPaper.paperId,
    title: savedPaper.title,
    authors: savedPaper.authors || [],
    abstract: savedPaper.abstract || "",
    publicationDate: savedPaper.year ? `${savedPaper.year}-01-01` : new Date().toISOString(),
    venue: "",
    citationCount: savedPaper.citations || 0,
    referenceCount: 0,
    fieldsOfStudy: [],
    pdfUrl: savedPaper.pdfUrl || undefined,
    doi: savedPaper.doi || undefined,
    source: (savedPaper.source as any) || "openalex",
    openAccess: !!savedPaper.pdfUrl,
  })

  // Filter papers based on search and collection
  const filteredPapers = savedPapers.filter((paper) => {
    const matchesSearch =
      searchQuery === "" ||
      paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.authors?.some((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCollection = selectedCollection === "all" || paper.collectionId === selectedCollection

    return matchesSearch && matchesCollection
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading saved papers...</span>
      </div>
    )
  }

  if (savedPapers.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto text-muted-foreground/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No saved papers yet</h3>
        <p className="text-muted-foreground mb-6">Start saving papers from search results to build your library</p>
        <Button asChild>
          <a href="/search">Search Papers</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCollection} onValueChange={setSelectedCollection}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Collections</SelectItem>
            {collections.map((col) => (
              <SelectItem key={col.id} value={col.id}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                  {col.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredPapers.length} of {savedPapers.length} saved papers
        </span>
        {selectedCollection !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedCollection("all")}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Papers Grid */}
      {filteredPapers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No papers match your search criteria</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredPapers.map((savedPaper) => {
            const collection = collections.find((c) => c.id === savedPaper.collectionId)
            return (
              <div key={savedPaper.id} className="relative group">
                {/* Collection Badge */}
                {collection && (
                  <div className="absolute -top-2 left-4 z-10 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-background border-2 shadow-sm">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: collection.color }} />
                    {collection.name}
                  </div>
                )}

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background border-2 hover:border-destructive hover:text-destructive shadow-sm"
                  onClick={() => setPaperToDelete(savedPaper.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                <PaperCard paper={convertToPaper(savedPaper)} />

                {/* Notes if available */}
                {savedPaper.notes && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Note:</span> {savedPaper.notes}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!paperToDelete} onOpenChange={() => setPaperToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Paper</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this paper from your library? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => paperToDelete && handleDelete(paperToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
