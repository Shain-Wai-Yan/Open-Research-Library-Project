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
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Link
                href={`/paper/${paper.id}`}
                className="text-lg font-serif font-semibold text-foreground hover:text-accent transition-colors"
              >
                {paper.title}
              </Link>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{paper.authors.map((a) => a.name).join(", ")}</span>
                <span>•</span>
                <span>{new Date(paper.publicationDate).getFullYear()}</span>
                <span>•</span>
                <span>{paper.venue}</span>
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={handleSaveClick}>
              <BookmarkPlus className="w-5 h-5" />
            </Button>
          </div>

          {/* Abstract */}
          <p className="text-sm text-muted-foreground line-clamp-3">{paper.abstract}</p>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{paper.citationCount} citations</Badge>
            {paper.methodology && (
              <Badge variant="outline" className="capitalize">
                {paper.methodology.replace("-", " ")}
              </Badge>
            )}
            {paper.openAccess && (
              <Badge variant="outline" className="border-green-600 text-green-600">
                Open Access
              </Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {paper.source}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {paper.pdfUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </a>
              </Button>
            )}
            {paper.doi && (
              <Button variant="outline" size="sm" asChild>
                <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
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
