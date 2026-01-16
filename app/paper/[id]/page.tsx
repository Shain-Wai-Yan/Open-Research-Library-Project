"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InsightEditor } from "@/components/insights/insight-editor"
import { ExternalLink, FileText, BookmarkPlus, Network } from "lucide-react"
import { getPaperById, getCitationNetwork } from "@/lib/mock-api"
import type { Paper } from "@/lib/types"

export default function PaperDetailPage() {
  const params = useParams()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [citations, setCitations] = useState<Paper[]>([])
  const [references, setReferences] = useState<Paper[]>([])

  useEffect(() => {
    const loadPaper = async () => {
      const data = await getPaperById(params.id as string)
      setPaper(data)

      if (data) {
        const network = await getCitationNetwork(data.id)
        setCitations(network.citations)
        setReferences(network.references)
      }
    }
    loadPaper()
  }, [params.id])

  if (!paper) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Header />

        <div className="p-8">
          <div className="max-w-5xl mx-auto">
            {/* Paper Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-serif font-bold text-foreground mb-4">{paper.title}</h1>

              <div className="flex items-center gap-3 text-muted-foreground mb-4">
                <span>{paper.authors.map((a) => a.name).join(", ")}</span>
                <span>•</span>
                <span>{new Date(paper.publicationDate).getFullYear()}</span>
                <span>•</span>
                <span>{paper.venue}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-6">
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

              <div className="flex items-center gap-3">
                <Button>
                  <BookmarkPlus className="w-4 h-4 mr-2" />
                  Save to Library
                </Button>
                {paper.pdfUrl && (
                  <Button variant="outline" asChild>
                    <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-4 h-4 mr-2" />
                      View PDF
                    </a>
                  </Button>
                )}
                {paper.doi && (
                  <Button variant="outline" asChild>
                    <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      DOI
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="abstract" className="space-y-6">
              <TabsList>
                <TabsTrigger value="abstract">Abstract</TabsTrigger>
                <TabsTrigger value="citations">Citations ({citations.length})</TabsTrigger>
                <TabsTrigger value="references">References ({references.length})</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="abstract">
                <Card className="p-8">
                  <h2 className="text-xl font-semibold mb-4">Abstract</h2>
                  <p className="text-muted-foreground leading-relaxed">{paper.abstract}</p>

                  {paper.fieldsOfStudy && paper.fieldsOfStudy.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold mb-2">Fields of Study</h3>
                      <div className="flex flex-wrap gap-2">
                        {paper.fieldsOfStudy.map((field) => (
                          <Badge key={field} variant="secondary">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="citations">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Network className="w-5 h-5 text-accent" />
                    <h2 className="text-xl font-semibold">Papers citing this work</h2>
                  </div>
                  {citations.map((cite) => (
                    <Card key={cite.id} className="p-6">
                      <h3 className="font-semibold mb-2">{cite.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {cite.authors.map((a) => a.name).join(", ")} • {new Date(cite.publicationDate).getFullYear()}
                      </p>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="references">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-4">References</h2>
                  {references.map((ref) => (
                    <Card key={ref.id} className="p-6">
                      <h3 className="font-semibold mb-2">{ref.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {ref.authors.map((a) => a.name).join(", ")} • {new Date(ref.publicationDate).getFullYear()}
                      </p>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="insights">
                <InsightEditor paperId={paper.id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
