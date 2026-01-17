"use client"

import { useState, useEffect, useRef } from "react"
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

interface GraphNode {
  id: string
  label: string
  type: "paper" | "author" | "citation"
  citations?: number
  x?: number
  y?: number
}

interface GraphLink {
  source: string
  target: string
  type: "authored" | "cited" | "cocited"
}

export default function NetworksPage() {
  const [collections, setCollections] = useState<any[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>("")
  const [papers, setPapers] = useState<SavedPaper[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [networkData, setNetworkData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
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

      // Add paper nodes
      papers.forEach((paper) => {
        nodes.push({
          id: paper.paperId,
          label: paper.title.substring(0, 50) + "...",
          type: "paper",
          citations: paper.citations,
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

      // Fetch citation connections for first 5 papers (to avoid rate limits)
      const samplePapers = papers.slice(0, 5)
      for (const paper of samplePapers) {
        if (paper.doi) {
          try {
            const citationData = await getCitationNetwork(paper.paperId, paper.doi)

            // Add citation links between papers in collection
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

  useEffect(() => {
    if (!networkData || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Simple force-directed layout simulation
    const nodePositions = new Map<string, { x: number; y: number; vx: number; vy: number }>()

    // Initialize positions randomly
    networkData.nodes.forEach((node) => {
      nodePositions.set(node.id, {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
      })
    })

    let iterations = 0
    const maxIterations = 100

    const simulate = () => {
      if (iterations >= maxIterations) return

      ctx.clearRect(0, 0, width, height)

      // Apply forces
      const nodes = networkData.nodes
      const links = networkData.links

      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const pos1 = nodePositions.get(nodes[i].id)!
          const pos2 = nodePositions.get(nodes[j].id)!

          const dx = pos2.x - pos1.x
          const dy = pos2.y - pos1.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1

          const force = 1000 / (dist * dist)
          pos1.vx -= (dx / dist) * force
          pos1.vy -= (dy / dist) * force
          pos2.vx += (dx / dist) * force
          pos2.vy += (dy / dist) * force
        }
      }

      // Attraction along links
      links.forEach((link) => {
        const pos1 = nodePositions.get(link.source)
        const pos2 = nodePositions.get(link.target)
        if (!pos1 || !pos2) return

        const dx = pos2.x - pos1.x
        const dy = pos2.y - pos1.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1

        const force = dist * 0.001
        pos1.vx += (dx / dist) * force
        pos1.vy += (dy / dist) * force
        pos2.vx -= (dx / dist) * force
        pos2.vy -= (dy / dist) * force
      })

      // Update positions
      nodePositions.forEach((pos) => {
        pos.x += pos.vx
        pos.y += pos.vy
        pos.vx *= 0.9
        pos.vy *= 0.9

        // Keep in bounds
        pos.x = Math.max(30, Math.min(width - 30, pos.x))
        pos.y = Math.max(30, Math.min(height - 30, pos.y))
      })

      // Draw links
      ctx.strokeStyle = "#ccc"
      ctx.lineWidth = 1
      links.forEach((link) => {
        const pos1 = nodePositions.get(link.source)
        const pos2 = nodePositions.get(link.target)
        if (!pos1 || !pos2) return

        ctx.beginPath()
        ctx.moveTo(pos1.x, pos1.y)
        ctx.lineTo(pos2.x, pos2.y)
        ctx.stroke()
      })

      // Draw nodes
      nodes.forEach((node) => {
        const pos = nodePositions.get(node.id)
        if (!pos) return

        ctx.beginPath()
        const radius = node.type === "paper" ? 8 : 5
        ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI)
        ctx.fillStyle = node.type === "paper" ? "#3b82f6" : "#10b981"
        ctx.fill()
        ctx.strokeStyle = "#fff"
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw label for papers
        if (node.type === "paper") {
          ctx.fillStyle = "#333"
          ctx.font = "10px sans-serif"
          ctx.fillText(node.label.substring(0, 20), pos.x + 10, pos.y + 3)
        }
      })

      iterations++
      requestAnimationFrame(simulate)
    }

    simulate()
  }, [networkData])

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
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                                  <span>Papers ({networkData.nodes.filter((n) => n.type === "paper").length})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-green-500" />
                                  <span>Authors ({networkData.nodes.filter((n) => n.type === "author").length})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-0.5 bg-gray-300" />
                                  <span>Connections ({networkData.links.length})</span>
                                </div>
                              </div>
                            </div>
                            <canvas
                              ref={canvasRef}
                              width={1000}
                              height={600}
                              className="w-full border rounded-lg bg-white"
                            />
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
                                  <h4 className="font-medium text-sm leading-tight">{paper.title}</h4>
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
