"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Network, AlertCircle, Loader2, Info, Maximize, Download, Filter } from "lucide-react"
import { getCollections, getSavedPapers, getCitationNetwork } from "@/lib/api-client"
import type { SavedPaper } from "@/lib/storage-adapter"
import { useToast } from "@/hooks/use-toast"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })

interface GraphNode {
  id: string
  label: string
  type: "paper" | "author"
  citations?: number
  year?: number
  field?: string
  color?: string
  doi?: string
  fx?: number // Fixed x position for pinning
  fy?: number // Fixed y position for pinning
}

interface GraphLink {
  source: string
  target: string
  type: "authored" | "cited"
  weight?: number
}

const generateFieldColor = (field: string): string => {
  let hash = 0
  for (let i = 0; i < field.length; i++) {
    hash = field.charCodeAt(i) + ((hash << 5) - hash)
  }
  // Use 60-75% saturation and 50-60% lightness for academic professional look
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 55%)`
}

function getFieldColor(fields: string[] | undefined): { field: string; color: string } {
  if (!fields || fields.length === 0) {
    return { field: "Uncategorized", color: "hsl(220, 10%, 60%)" }
  }
  const primaryField = fields[0]
  return { field: primaryField, color: generateFieldColor(primaryField) }
}

const calculateNodeSize = (citations: number | undefined, type: string): number => {
  if (type === "author") return 5
  if (!citations || citations === 0) return 8
  // Log10 scale prevents outliers from dominating visualization
  return Math.max(8, Math.min(30, 8 + Math.log10(citations + 1) * 5))
}

const calculateLinkWidth = (linkType: string, sourceNode?: any, targetNode?: any): number => {
  if (linkType === "cited") {
    const sourceCitations = sourceNode?.citations || 0
    const targetCitations = targetNode?.citations || 0
    return 1 + Math.log10((sourceCitations + targetCitations) / 2 + 1) * 0.5
  }
  return 1
}

export default function NetworksPage() {
  const [collections, setCollections] = useState<any[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>("")
  const [papers, setPapers] = useState<SavedPaper[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [networkData, setNetworkData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)

  const [showAuthors, setShowAuthors] = useState(true)
  const [highlightClusters, setHighlightClusters] = useState(true)
  const [minCitations, setMinCitations] = useState(0)
  const [linkDistance, setLinkDistance] = useState(150)
  const [chargeStrength, setChargeStrength] = useState(-300)

  const graphRef = useRef<any>()
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

      const filteredPapers = papers.filter((p) => !minCitations || (p.citations || 0) >= minCitations)

      filteredPapers.forEach((paper) => {
        const { field, color } = getFieldColor(paper.fieldsOfStudy)

        nodes.push({
          id: paper.paperId,
          label: paper.title.substring(0, 50) + "...",
          type: "paper",
          citations: paper.citations || 0,
          year: paper.year,
          field,
          color,
          doi: paper.doi,
        })

        // Extract author nodes only if enabled
        if (showAuthors && paper.authors && Array.isArray(paper.authors)) {
          paper.authors.forEach((author: any) => {
            const authorName = typeof author === "string" ? author : author.name
            if (authorName && typeof authorName === "string") {
              const authorId = `author-${authorName}`
              if (!authorSet.has(authorId)) {
                authorSet.add(authorId)
                nodes.push({
                  id: authorId,
                  label: authorName,
                  type: "author",
                  color: "hsl(220, 10%, 50%)",
                })
              }
              links.push({
                source: authorId,
                target: paper.paperId,
                type: "authored",
                weight: 1,
              })
            }
          })
        }
      })

      const samplePapers = filteredPapers.slice(0, 10)
      let citationsFetched = 0

      for (const paper of samplePapers) {
        if (paper.doi) {
          try {
            const citationData = await getCitationNetwork(paper.paperId, paper.doi)
            citationsFetched++

            citationData.references?.slice(0, 10).forEach((ref: any) => {
              const refInCollection = filteredPapers.find((p) => p.paperId === ref.paperId || p.doi === ref.doi)
              if (refInCollection) {
                links.push({
                  source: paper.paperId,
                  target: refInCollection.paperId,
                  type: "cited",
                  weight: 2,
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
        title: "Network built successfully",
        description: `Visualizing ${nodes.length} nodes and ${links.length} connections (${citationsFetched} papers with citations)`,
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

  const paintNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const size = calculateNodeSize(node.citations, node.type)
    const currentYear = new Date().getFullYear()
    const isRecent = node.year && node.year >= currentYear - 2

    // Add glow for recent papers
    if (isRecent && node.type === "paper" && highlightClusters) {
      ctx.shadowBlur = 15
      ctx.shadowColor = node.color || "#3b82f6"
    } else {
      ctx.shadowBlur = 0
    }

    // Draw node
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
    ctx.fillStyle = node.color || "#94a3b8"
    ctx.fill()

    // Border
    ctx.strokeStyle = isRecent ? "#fff" : "rgba(255,255,255,0.6)"
    ctx.lineWidth = isRecent ? 2.5 : 1.5
    ctx.stroke()
    ctx.shadowBlur = 0

    // Labels for important nodes
    if (size > 12 && globalScale > 1.2) {
      ctx.font = `${Math.max(3, size / 3)}px Sans-Serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = "#fff"
      const maxChars = Math.floor(size / 1.5)
      ctx.fillText(node.label.substring(0, maxChars), node.x, node.y)
    }
  }

  const exportNetwork = () => {
    if (graphRef.current) {
      const canvas = graphRef.current.renderer().domElement
      const link = document.createElement("a")
      link.download = `network-${selectedCollection}-${Date.now()}.png`
      link.href = canvas.toDataURL()
      link.click()
      toast({
        title: "Network exported",
        description: "PNG image downloaded successfully",
      })
    }
  }

  const getNetworkMetrics = () => {
    if (!networkData) return null

    const paperNodes = networkData.nodes.filter((n) => n.type === "paper")
    const citationLinks = networkData.links.filter((l) => l.type === "cited")
    const fields = Array.from(new Set(paperNodes.map((n) => n.field).filter(Boolean)))

    // Network density
    const possibleLinks = (paperNodes.length * (paperNodes.length - 1)) / 2
    const density = possibleLinks > 0 ? ((citationLinks.length / possibleLinks) * 100).toFixed(1) : "0.0"

    // Field diversity
    const fieldDistribution = fields.map((field) => ({
      field,
      count: paperNodes.filter((n) => n.field === field).length,
    }))

    // Identify silos (isolated clusters)
    const connectedFields = new Set<string>()
    citationLinks.forEach((link) => {
      const source = networkData.nodes.find((n) => n.id === link.source)
      const target = networkData.nodes.find((n) => n.id === link.target)
      if (source?.field && target?.field && source.field !== target.field) {
        connectedFields.add(source.field)
        connectedFields.add(target.field)
      }
    })
    const isolatedFields = fields.filter((f) => !connectedFields.has(f as string))

    return { density, fieldDistribution, isolatedFields, citationLinks: citationLinks.length }
  }

  const metrics = getNetworkMetrics()

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Header />

        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Research Networks</h1>
              <p className="text-muted-foreground">
                Professional citation network visualization with cluster analysis and interdisciplinary bridge detection
              </p>
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
                <Card className="p-4 bg-accent/50 border-accent">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-accent-foreground shrink-0 mt-0.5" />
                    <div className="text-sm text-accent-foreground space-y-1">
                      <p className="font-medium">Industry Best Practices Implemented:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>
                          <strong>Log-scale node sizing</strong> - Prevents citation outliers from dominating (VOSviewer
                          methodology)
                        </li>
                        <li>
                          <strong>Dynamic HSL coloring</strong> - Unlimited field colors with consistent academic
                          palette
                        </li>
                        <li>
                          <strong>Recency indicators</strong> - Papers from last 2 years glow (Connected Papers feature)
                        </li>
                        <li>
                          <strong>Citation-weighted links</strong> - Thickness reflects connection strength
                        </li>
                        <li>
                          <strong>Cluster detection</strong> - Identifies research silos and interdisciplinary bridges
                        </li>
                        <li>
                          <strong>Force-directed layout</strong> - Industry-standard D3 physics simulation
                        </li>
                        <li>
                          <strong>Interactive controls</strong> - Zoom, pan, filter, and export capabilities
                        </li>
                      </ul>
                    </div>
                  </div>
                </Card>

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
                      <>
                        <div className="border-t pt-4 space-y-4">
                          <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <h4 className="font-medium text-sm">Visualization Controls</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="show-authors" className="text-sm">
                                Show Author Nodes
                              </Label>
                              <Switch id="show-authors" checked={showAuthors} onCheckedChange={setShowAuthors} />
                            </div>

                            <div className="flex items-center justify-between">
                              <Label htmlFor="highlight-clusters" className="text-sm">
                                Highlight Recent Papers
                              </Label>
                              <Switch
                                id="highlight-clusters"
                                checked={highlightClusters}
                                onCheckedChange={setHighlightClusters}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Minimum Citations: {minCitations}</Label>
                            <Slider
                              value={[minCitations]}
                              onValueChange={([val]) => setMinCitations(val)}
                              min={0}
                              max={100}
                              step={5}
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Link Distance: {linkDistance}px</Label>
                            <Slider
                              value={[linkDistance]}
                              onValueChange={([val]) => setLinkDistance(val)}
                              min={50}
                              max={300}
                              step={10}
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Repulsion Strength: {Math.abs(chargeStrength)}</Label>
                            <Slider
                              value={[Math.abs(chargeStrength)]}
                              onValueChange={([val]) => setChargeStrength(-val)}
                              min={100}
                              max={500}
                              step={50}
                              className="w-full"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
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

                          {networkData && (
                            <Button variant="outline" onClick={exportNetwork}>
                              <Download className="w-4 h-4 mr-2" />
                              Export PNG
                            </Button>
                          )}
                        </div>
                      </>
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
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Citation Network Visualization</h3>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => graphRef.current?.zoomToFit(400)}>
                                    <Maximize className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="mb-4">
                                <p className="text-sm font-medium mb-2">
                                  Research Fields ({metrics?.fieldDistribution.length || 0} detected):
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {metrics?.fieldDistribution.map(({ field, count }) => {
                                    const node = networkData.nodes.find((n) => n.field === field)
                                    return (
                                      <Badge key={field} variant="secondary" className="flex items-center gap-2">
                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: node?.color }}
                                        />
                                        <span>
                                          {field} ({count})
                                        </span>
                                      </Badge>
                                    )
                                  })}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                                  <span>Papers ({networkData.nodes.filter((n) => n.type === "paper").length})</span>
                                </div>
                                {showAuthors && (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-gray-500" />
                                    <span>Authors ({networkData.nodes.filter((n) => n.type === "author").length})</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-0.5 bg-blue-400" />
                                  <span>Citations ({metrics?.citationLinks || 0})</span>
                                </div>
                              </div>
                            </div>

                            <div className="border rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
                              <ForceGraph2D
                                ref={graphRef}
                                graphData={{
                                  nodes: networkData.nodes,
                                  links: networkData.links,
                                }}
                                nodeCanvasObject={paintNode}
                                nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                                  const size = calculateNodeSize(node.citations, node.type)
                                  ctx.fillStyle = color
                                  ctx.beginPath()
                                  ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI)
                                  ctx.fill()
                                }}
                                nodeLabel={(node: any) => {
                                  if (node.type === "paper") {
                                    return `
                                      <div style="background: rgba(0,0,0,0.9); color: white; padding: 10px; border-radius: 8px; font-size: 12px; max-width: 280px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                                        <div style="font-weight: 600; margin-bottom: 6px; line-height: 1.3;">${node.label}</div>
                                        <div style="color: ${node.color}; font-weight: 500; margin-bottom: 4px;">${node.field || "Uncategorized"}</div>
                                        <div style="color: #a3a3a3; font-size: 11px;">
                                          📊 ${node.citations || 0} citations${node.year ? ` • 📅 ${node.year}` : ""}
                                        </div>
                                        ${node.doi ? '<div style="color: #3b82f6; margin-top: 4px; font-size: 10px;">🔗 Click to open DOI</div>' : ""}
                                      </div>
                                    `
                                  }
                                  return `<div style="background: rgba(0,0,0,0.85); color: white; padding: 6px 10px; border-radius: 6px; font-size: 11px;">${node.label}</div>`
                                }}
                                linkWidth={(link: any) => {
                                  const sourceNode = networkData.nodes.find((n) => n.id === link.source)
                                  const targetNode = networkData.nodes.find((n) => n.id === link.target)
                                  return calculateLinkWidth(link.type, sourceNode, targetNode)
                                }}
                                linkColor={(link: any) => (link.type === "cited" ? "#3b82f6" : "#d1d5db")}
                                linkDirectionalParticles={(link: any) => (link.type === "cited" ? 3 : 0)}
                                linkDirectionalParticleWidth={2.5}
                                linkDirectionalParticleSpeed={0.005}
                                onNodeClick={(node: any) => {
                                  if (node.type === "paper" && node.doi) {
                                    window.open(`https://doi.org/${node.doi}`, "_blank")
                                  }
                                }}
                                onNodeRightClick={(node: any) => {
                                  // Pin/unpin node on right-click
                                  if (node.fx === undefined) {
                                    node.fx = node.x
                                    node.fy = node.y
                                  } else {
                                    node.fx = undefined
                                    node.fy = undefined
                                  }
                                }}
                                d3AlphaDecay={0.02}
                                d3VelocityDecay={0.3}
                                d3Force={{
                                  charge: { strength: chargeStrength },
                                  link: { distance: linkDistance },
                                  collide: { radius: (node: any) => calculateNodeSize(node.citations, node.type) + 5 },
                                }}
                                warmupTicks={100}
                                cooldownTicks={1000}
                                width={1100}
                                height={700}
                                backgroundColor="#f8fafc"
                                enableNodeDrag={true}
                                enableZoomInteraction={true}
                                enablePanInteraction={true}
                              />
                            </div>

                            <div className="mt-4 p-4 bg-muted rounded-lg">
                              <p className="text-sm font-medium mb-3">Network Analysis Metrics:</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                  <span className="text-muted-foreground block mb-1">Network Density:</span>
                                  <div className="font-semibold text-base">{metrics?.density}%</div>
                                  <p className="text-muted-foreground mt-1">Citation connectivity</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block mb-1">Research Fields:</span>
                                  <div className="font-semibold text-base">
                                    {metrics?.fieldDistribution.length || 0}
                                  </div>
                                  <p className="text-muted-foreground mt-1">Distinct areas detected</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block mb-1">Research Silos:</span>
                                  <div className="font-semibold text-base text-orange-600">
                                    {metrics?.isolatedFields.length || 0}
                                  </div>
                                  <p className="text-muted-foreground mt-1">Disconnected clusters</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block mb-1">Cross-citations:</span>
                                  <div className="font-semibold text-base text-green-600">
                                    {metrics?.citationLinks || 0}
                                  </div>
                                  <p className="text-muted-foreground mt-1">Internal connections</p>
                                </div>
                              </div>

                              {metrics && metrics.isolatedFields.length > 0 && (
                                <div className="mt-4 pt-3 border-t">
                                  <p className="text-xs font-medium text-orange-600 mb-2">⚠️ Isolated Research Areas:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {metrics.isolatedFields.map((field) => (
                                      <Badge key={field} variant="outline" className="text-xs">
                                        {field}
                                      </Badge>
                                    ))}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    These fields have no citation links to other areas in your collection. Consider
                                    exploring interdisciplinary connections.
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-900">
                              <p className="font-medium mb-1">💡 Interaction Tips:</p>
                              <ul className="list-disc list-inside space-y-0.5 ml-2">
                                <li>Click paper nodes to open DOI</li>
                                <li>Right-click nodes to pin/unpin position</li>
                                <li>Scroll to zoom, drag to pan</li>
                                <li>Hover for detailed information</li>
                                <li>Drag nodes to rearrange layout</li>
                              </ul>
                            </div>
                          </Card>
                        )}
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
