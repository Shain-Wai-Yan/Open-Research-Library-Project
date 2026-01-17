"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Network, AlertCircle, Loader2 } from "lucide-react"
import { getCollections, getSavedPapers, getCitationNetwork } from "@/lib/api-client"
import type { SavedPaper } from "@/lib/storage-adapter"
import { useToast } from "@/hooks/use-toast"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })

interface GraphNode {
  id: string
  label: string
  type: "paper" | "author"
  citations?: number
  field?: string // Added field for cluster highlighting
  color?: string // Added color for cluster highlighting
}

interface GraphLink {
  source: string
  target: string
  type: "authored" | "cited"
}

const FIELD_COLORS: Record<string, string> = {
  "Computer Science": "#3b82f6", // Blue
  Medicine: "#ef4444", // Red
  Biology: "#10b981", // Green
  Psychology: "#f59e0b", // Orange
  Physics: "#8b5cf6", // Purple
  Chemistry: "#06b6d4", // Cyan
  Mathematics: "#ec4899", // Pink
  Engineering: "#84cc16", // Lime
  Business: "#f97316", // Orange-red
  Economics: "#14b8a6", // Teal
  Sociology: "#a855f7", // Purple-pink
  "Environmental Science": "#22c55e", // Green-lime
  Default: "#94a3b8", // Slate gray
}

function getFieldColor(fields: string[] | undefined): { field: string; color: string } {
  if (!fields || fields.length === 0) {
    return { field: "Uncategorized", color: FIELD_COLORS["Default"] }
  }
  const primaryField = fields[0]
  const color = FIELD_COLORS[primaryField] || FIELD_COLORS["Default"]
  return { field: primaryField, color }
}

export default function NetworksPage() {
  const [collections, setCollections] = useState<any[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>("")
  const [papers, setPapers] = useState<SavedPaper[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [networkData, setNetworkData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const graphRef = useRef<any>() // Reference to ForceGraph component
  const { toast } = useToast()

  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    try {
      const data = await getCollections()
      setCollections(data)
    } catch (error) {
      console.error("[Networks] Failed to load collections:", error)
    }
  }

  const loadPapers = async (collectionId: string) => {
    setIsLoading(true)
    setNetworkData(null)
    try {
      const data = await getSavedPapers(collectionId)
      setPapers(data)
    } catch (error) {
      console.error("[Networks] Failed to load papers:", error)
      toast({
        title: "Error",
        description: "Failed to load papers",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCollectionChange = (collectionId: string) => {
    setSelectedCollection(collectionId)
    loadPapers(collectionId)
  }

  const buildNetwork = async () => {
    if (papers.length === 0) return

    setIsBuilding(true)
    try {
      const nodes: GraphNode[] = []
      const links: GraphLink[] = []
      const authorSet = new Set<string>()

      papers.forEach((paper) => {
        const { field, color } = getFieldColor(paper.fieldsOfStudy)

        nodes.push({
          id: paper.paperId,
          label: paper.title.substring(0, 50) + "...",
          type: "paper",
          citations: paper.citations,
          field,
          color,
        })

        // Extract author nodes
        if (paper.authors && Array.isArray(paper.authors)) {
          paper.authors.forEach((author: any) => {
            const authorName = typeof author === "string" ? author : author.name
            if (authorName) {
              const authorId = `author-${authorName}`
              if (!authorSet.has(authorId)) {
                authorSet.add(authorId)
                nodes.push({
                  id: authorId,
                  label: authorName,
                  type: "author",
                  color: "#64748b", // Slate gray for authors
                })
              }
              links.push({
                source: authorId,
                target: paper.paperId,
                type: "authored",
              })
            }
          })
        }
      })

      // Fetch citation connections for first 5 papers
      const samplePapers = papers.slice(0, 5)
      for (const paper of samplePapers) {
        if (paper.doi) {
          try {
            const citationData = await getCitationNetwork(paper.paperId, paper.doi)

            citationData.references?.slice(0, 10).forEach((ref: any) => {
              const refInCollection = papers.find((p) => p.paperId === ref.paperId || p.doi === ref.doi)
              if (refInCollection) {
                links.push({
                  source: paper.paperId,
                  target: refInCollection.paperId,
                  type: "cited",
                })
              }
            })
          } catch (error) {
            console.error(`[Networks] Failed to get citations for ${paper.paperId}:`, error)
          }
        }
      }

      setNetworkData({ nodes, links })
      toast({
        title: "Network built",
        description: `Visualizing ${nodes.length} nodes and ${links.length} connections`,
      })
    } catch (error) {
      console.error("[Networks] Failed to build network:", error)
      toast({
        title: "Error",
        description: "Failed to build citation network",
        variant: "destructive",
      })
    } finally {
      setIsBuilding(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Header />

        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Research Networks</h1>
              <p className="text-muted-foreground">Visualize citation and author collaboration networks</p>
            </div>

            {collections.length === 0 ? (
              <Card className="p-16 text-center">
                <Network className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Collections Yet</h3>
                <p className="text-muted-foreground">
                  Create a collection and save papers to visualize research networks
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Collection</label>
                      <Select value={selectedCollection} onValueChange={handleCollectionChange}>
                        <SelectTrigger className="w-full max-w-md">
                          <SelectValue placeholder="Choose a collection to visualize" />
                        </SelectTrigger>
                        <SelectContent>
                          {collections.map((col) => (
                            <SelectItem key={col.id} value={col.id!}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {papers.length > 0 && (
                      <Button onClick={buildNetwork} disabled={isBuilding}>
                        {isBuilding ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Building Network...
                          </>
                        ) : (
                          <>
                            <Network className="w-4 h-4 mr-2" />
                            Build Citation Network
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </Card>

                {selectedCollection && (
                  <>
                    {isLoading ? (
                      <Card className="p-16 text-center">
                        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                        <p className="text-muted-foreground">Loading papers...</p>
                      </Card>
                    ) : papers.length === 0 ? (
                      <Card className="p-16 text-center">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No Papers in Collection</h3>
                        <p className="text-muted-foreground">
                          Add papers to this collection to visualize their research network
                        </p>
                      </Card>
                    ) : (
                      <>
                        {networkData && (
                          <Card className="p-6">
                            <div className="mb-4">
                              <h3 className="text-lg font-semibold mb-2">Citation Network</h3>

                              <div className="mb-4">
                                <p className="text-sm font-medium mb-2">Research Fields:</p>
                                <div className="flex flex-wrap gap-2">
                                  {Array.from(
                                    new Set(
                                      networkData.nodes
                                        .filter((n) => n.type === "paper" && n.field)
                                        .map((n) => n.field),
                                    ),
                                  ).map((field) => {
                                    const node = networkData.nodes.find((n) => n.field === field)
                                    return (
                                      <Badge key={field} variant="secondary" className="flex items-center gap-2">
                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: node?.color }}
                                        />
                                        <span>{field}</span>
                                      </Badge>
                                    )
                                  })}
                                </div>
                              </div>

                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                                  <span>Papers ({networkData.nodes.filter((n) => n.type === "paper").length})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-slate-500" />
                                  <span>Authors ({networkData.nodes.filter((n) => n.type === "author").length})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-0.5 bg-gray-300" />
                                  <span>Connections ({networkData.links.length})</span>
                                </div>
                              </div>
                            </div>

                            <div className="border rounded-lg bg-white">
                              <ForceGraph2D
                                ref={graphRef}
                                graphData={{
                                  nodes: networkData.nodes,
                                  links: networkData.links,
                                }}
                                nodeLabel={(node: any) => `${node.label}${node.field ? ` (${node.field})` : ""}`}
                                nodeColor={(node: any) => node.color || "#94a3b8"}
                                nodeRelSize={6}
                                nodeVal={(node: any) => (node.type === "paper" ? 10 : 5)}
                                linkColor={() => "#d1d5db"}
                                linkWidth={1.5}
                                linkDirectionalParticles={2}
                                linkDirectionalParticleWidth={2}
                                onNodeClick={(node: any) => {
                                  if (node.type === "paper") {
                                    const paper = papers.find((p) => p.paperId === node.id)
                                    if (paper?.doi) {
                                      window.open(`https://doi.org/${paper.doi}`, "_blank")
                                    }
                                  }
                                }}
                                width={1000}
                                height={600}
                                backgroundColor="#ffffff"
                              />
                            </div>
                          </Card>
                        )}

                        {/* Paper list */}
                        <Card className="p-6">
                          <div className="mb-4 flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">Papers in Collection</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {papers.length} paper{papers.length !== 1 ? "s" : ""} saved
                              </p>
                            </div>
                            {!networkData && (
                              <Badge variant="secondary">Click "Build Citation Network" to visualize</Badge>
                            )}
                          </div>

                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {papers.map((paper) => (
                              <Card key={paper.id} className="p-4">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-medium text-sm leading-tight">{paper.title}</h4>
                                    {paper.fieldsOfStudy && paper.fieldsOfStudy.length > 0 && (
                                      <Badge
                                        variant="outline"
                                        className="shrink-0"
                                        style={{
                                          borderColor: getFieldColor(paper.fieldsOfStudy).color,
                                          color: getFieldColor(paper.fieldsOfStudy).color,
                                        }}
                                      >
                                        {paper.fieldsOfStudy[0]}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {paper.authors && Array.isArray(paper.authors) && (
                                      <span>
                                        {paper.authors
                                          .slice(0, 2)
                                          .map((a: any) => (typeof a === "string" ? a : a.name))
                                          .join(", ")}
                                      </span>
                                    )}
                                    {paper.year && (
                                      <>
                                        <span>•</span>
                                        <span>{paper.year}</span>
                                      </>
                                    )}
                                    {paper.citations !== null && (
                                      <>
                                        <span>•</span>
                                        <span>{paper.citations} citations</span>
                                      </>
                                    )}
                                  </div>
                                  {paper.doi && (
                                    <a
                                      href={`https://doi.org/${paper.doi}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-accent hover:underline"
                                    >
                                      View Paper →
                                    </a>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </Card>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
