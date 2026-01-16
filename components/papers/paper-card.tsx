"use client"

import Link from "next/link"
import { ExternalLink, BookmarkPlus, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Paper } from "@/lib/types"

interface PaperCardProps {
  paper: Paper
  onSave?: (paperId: string) => void
}

export function PaperCard({ paper, onSave }: PaperCardProps) {
  return (
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

          <Button variant="ghost" size="icon" onClick={() => onSave?.(paper.id)}>
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
  )
}
