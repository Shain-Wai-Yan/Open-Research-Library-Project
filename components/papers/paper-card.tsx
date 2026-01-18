"use client"

import Link from "next/link"
import { ExternalLink, BookmarkPlus, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Paper } from "@/lib/types"
import { useState, useEffect } from "react"
import { getCollections, savePaperToCollection } from "@/lib/api-client"

interface PaperCardProps {
  paper: Paper
  onSave?: (paperId: string) => void
}

export function PaperCard({ paper, onSave }: PaperCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [collections, setCollections] = useState<any[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    const data = await getCollections()
    setCollections(data)
  }

  const handleSaveClick = () => {
    setIsDialogOpen(true)
  }

  const handleSaveToCollection = async () => {
    if (!selectedCollection) return

    setIsSaving(true)
    try {
      console.log("[v0] Saving paper to collection...")
      await savePaperToCollection(selectedCollection, paper)
      onSave?.(paper.id)
      setIsDialogOpen(false)
      setSelectedCollection("")
      const successToast = document.createElement("div")
      successToast.className = "fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50"
      successToast.textContent = "Paper saved successfully!"
      document.body.appendChild(successToast)
      setTimeout(() => successToast.remove(), 3000)
    } catch (error) {
      console.error("[PaperCard] Failed to save:", error)
      alert("Failed to save paper. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Card className="p-4 md:p-6 border-2 hover:border-primary/50 transition-all duration-300 hover-lift group animate-slide-up">
        <div className="space-y-3 md:space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Link
                href={`/paper/${encodeURIComponent(paper.id)}`}
                className="text-base md:text-lg font-serif font-semibold text-foreground hover:text-primary transition-colors duration-300 group-hover:text-primary line-clamp-3 md:line-clamp-none"
              >
                {paper.title}
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
                <span className="line-clamp-1">{paper.authors.slice(0, 3).map((a) => a.name).join(", ")}{paper.authors.length > 3 ? "..." : ""}</span>
                <span className="hidden sm:inline">•</span>
                <span>{new Date(paper.publicationDate).getFullYear()}</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline truncate">{paper.venue}</span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSaveClick}
              className="hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:scale-110 shrink-0 h-8 w-8 md:h-9 md:w-9"
            >
              <BookmarkPlus className="w-4 md:w-5 h-4 md:h-5" />
            </Button>
          </div>

          {/* Abstract */}
          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 md:line-clamp-3">{paper.abstract}</p>

          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <Badge variant="secondary" className="gradient-teal text-white border-0 text-xs">
              {paper.citationCount} citations
            </Badge>
            {paper.methodology && (
              <Badge variant="outline" className="capitalize border-chart-2 text-chart-2 text-xs">
                {paper.methodology.replace("-", " ")}
              </Badge>
            )}
            {paper.openAccess && (
              <Badge variant="outline" className="gradient-emerald text-white border-0 text-xs">
                Open Access
              </Badge>
            )}
            <Badge variant="outline" className="capitalize border-chart-4 text-chart-4 text-xs">
              {paper.source}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {paper.pdfUrl && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-2 hover:border-chart-1 hover:text-chart-1 transition-all duration-300 bg-transparent h-8 text-xs"
              >
                <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="w-3 md:w-4 h-3 md:h-4 mr-1.5" />
                  PDF
                </a>
              </Button>
            )}
            {paper.doi && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-2 hover:border-chart-2 hover:text-chart-2 transition-all duration-300 bg-transparent h-8 text-xs"
              >
                <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 md:w-4 h-3 md:h-4 mr-1.5" />
                  DOI
                </a>
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Paper to Collection</DialogTitle>
            <DialogDescription>Choose a collection to save this paper</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {collections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No collections yet. Create one from the dashboard first.</p>
            ) : (
              <>
                <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((col) => (
                      <SelectItem key={col.id} value={col.id!}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleSaveToCollection} className="w-full" disabled={!selectedCollection || isSaving}>
                  {isSaving ? "Saving..." : "Save to Collection"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
