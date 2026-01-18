"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
import { Network, AlertCircle, Loader2, Maximize, Download, Filter, Focus } from "lucide-react"
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
  x?: number
  y?: number
  neighbors?: Set<string>
  links?: Set<string>
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  type: "authored" | "cited"
  weight?: number
  citationCount?: number
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
  const [selectedCollection, setSelectedCollection] = useState<string>("default-collection")
  const [papers, setPapers] = useState<SavedPaper[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [networkData, setNetworkData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)

  // UI Controls
  const [showAuthors, setShowAuthors] = useState(true)
  const [highlightClusters, setHighlightClusters] = useState(true)
  const [minCitations, setMinCitations] = useState(0)
  const [linkDistance, setLinkDistance] = useState(150)
  const [chargeStrength, setChargeStrength] = useState(-300)
  const [dagMode, setDagMode] = useState<string>("")
  const [enableCurvedLinks, setEnableCurvedLinks] = useState(false)
  const [showLinkLabels, setShowLinkLabels] = useState(false)
  const [showArrows, setShowArrows] = useState(true)

  // Interaction state
  const [highlightNodes, setHighlightNodes] = useState(new Set<string>())
  const [highlightLinks, setHighlightLinks] = useState(new Set<string>())
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null)
  const [selectedNodes, setSelectedNodes] = useState(new Set<string>())

  const graphRef = useRef<any>()
  const lastHoverRef = useRef<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadCollections()
  }, [])

  // Configure d3 forces ONLY when controls change (not on hover or networkData change)
  useEffect(() => {
    if (!graphRef.current) return
    const fg = graphRef.current

    // Configure charge force with reduced strength to prevent runaway
    fg.d3Force("charge")?.strength(chargeStrength * 0.7)

    // Configure link force with moderate strength
    fg.d3Force("link")?.distance(linkDistance).strength(0.5)

    // Add collision force with CONSTANT strength (never hover-dependent)
    const d3 = require("d3-force-3d")
    fg.d3Force(
      "collide",
      d3
        .forceCollide()
        .radius((node: any) => calculateNodeSize(node.citations, node.type) + 8)
        .strength(0.15)
    )

    // Only reheat when controls actually change
    fg.d3ReheatSimulation()
  }, [chargeStrength, linkDistance])

  // Freeze physics completely after layout (hard stop)
  useEffect(() => {
    if (!graphRef.current || !networkData) return

    const fg = graphRef.current
    let cancelled = false

    const timeout = setTimeout(() => {
      if (cancelled) return
      // Hard-lock the graph by zeroing all forces
      fg.d3Force("charge")?.strength(0)
      fg.d3Force("link")?.strength(0)
      fg.d3Force("collide")?.strength(0)
    }, 2500)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [networkData])

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
      const citationCounts = new Map<string, number>()

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
          neighbors: new Set(),
          links: new Set(),
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
                  neighbors: new Set(),
                  links: new Set(),
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
                const linkKey = `${paper.paperId}-${refInCollection.paperId}`
                const currentCount = citationCounts.get(linkKey) || 0
                citationCounts.set(linkKey, currentCount + 1)

                if (currentCount === 0) {
                  links.push({
                    source: paper.paperId,
                    target: refInCollection.paperId,
                    type: "cited",
                    weight: 2,
                    citationCount: 1,
                  })
                }
              }
            })
          } catch (error) {
            console.error(`[Networks] Failed to get citations for ${paper.paperId}:`, error)
          }
        }
      }

      // Update citation counts on links
      links.forEach((link) => {
        if (link.type === "cited") {
          const sourceId = typeof link.source === "string" ? link.source : link.source.id
          const targetId = typeof link.target === "string" ? link.target : link.target.id
          const linkKey = `${sourceId}-${targetId}`
          link.citationCount = citationCounts.get(linkKey) || 1
        }
      })

      // Build neighbor and link relationships for highlighting
      const nodeMap = new Map(nodes.map((node) => [node.id, node]))
      links.forEach((link) => {
        const sourceId = typeof link.source === "string" ? link.source : link.source.id
        const targetId = typeof link.target === "string" ? link.target : link.target.id
        const linkId = `${sourceId}-${targetId}`

        const sourceNode = nodeMap.get(sourceId)
        const targetNode = nodeMap.get(targetId)

        if (sourceNode && targetNode) {
          sourceNode.neighbors?.add(targetId)
          targetNode.neighbors?.add(sourceId)
          sourceNode.links?.add(linkId)
          targetNode.links?.add(linkId)
        }
      })

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

  // Hover highlighting handler with debounce to prevent runaway nodes
  const handleNodeHover = useCallback((node: GraphNode | null) => {
    const nodeId = node?.id ?? null

    // Only update if the hovered node actually changed
    if (lastHoverRef.current === nodeId) return
    lastHoverRef.current = nodeId

    const newHighlightNodes = new Set<string>()
    const newHighlightLinks = new Set<string>()

    if (node) {
      newHighlightNodes.add(node.id)
      node.neighbors?.forEach((neighborId) => newHighlightNodes.add(neighborId))
      node.links?.forEach((linkId) => newHighlightLinks.add(linkId))
    }

    setHighlightNodes(newHighlightNodes)
    setHighlightLinks(newHighlightLinks)
    setHoverNode(node)
  }, [])

  // Click to focus on node
  const handleNodeClick = useCallback(
    (node: GraphNode, event: MouseEvent) => {
      // Handle multi-select with Ctrl/Cmd key
      if (event.ctrlKey || event.metaKey) {
        const newSelected = new Set(selectedNodes)
        if (newSelected.has(node.id)) {
          newSelected.delete(node.id)
        } else {
          newSelected.add(node.id)
        }
        setSelectedNodes(newSelected)
        toast({
          title: `${newSelected.size} nodes selected`,
          description: "Ctrl+click to add/remove nodes from selection",
        })
      } else {
        // Center on clicked node
        if (graphRef.current) {
          const distance = 200
          const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0)

          graphRef.current.centerAt(node.x, node.y, 1000)
          graphRef.current.zoom(2.5, 1000)
        }
        setSelectedNodes(new Set([node.id]))
      }
    },
    [selectedNodes, toast]
  )

  // Double-click to open DOI link
  const handleNodeDoubleClick = useCallback((node: GraphNode) => {
    if (node.type === "paper" && node.doi) {
      const doiUrl = node.doi.startsWith("http")
        ? node.doi
        : `https://doi.org/${node.doi}`

      window.open(doiUrl, "_blank", "noopener,noreferrer")
    }
  }, [])

  // Auto-fix nodes after dragging
  const handleNodeDragEnd = useCallback((node: GraphNode) => {
    if (node.x !== undefined && node.y !== undefined) {
      node.fx = node.x
      node.fy = node.y
    }
  }, [])

  // Link hover handler
  const handleLinkHover = useCallback((link: GraphLink | null) => {
    const newHighlightLinks = new Set<string>()
    const newHighlightNodes = new Set<string>()

    if (link) {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id
      const targetId = typeof link.target === "string" ? link.target : link.target.id
      const linkId = `${sourceId}-${targetId}`

      newHighlightLinks.add(linkId)
      newHighlightNodes.add(sourceId)
      newHighlightNodes.add(targetId)
    }

    setHighlightLinks(newHighlightLinks)
    setHighlightNodes(newHighlightNodes)
  }, [])

  const paintNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const size = calculateNodeSize(node.citations, node.type)
    const currentYear = new Date().getFullYear()
    const isRecent = node.year && node.year >= currentYear - 2
    const isHighlighted = highlightNodes.has(node.id)
    const isSelected = selectedNodes.has(node.id)
    const isDimmed = highlightNodes.size > 0 && !isHighlighted

    // Dimmed style for non-highlighted nodes when hovering
    const opacity = isDimmed ? 0.2 : 1.0

    // Add glow for highlighted, selected, or recent papers
    if (isHighlighted || isSelected) {
      ctx.shadowBlur = 20
      ctx.shadowColor = node.color || "#3b82f6"
    } else if (isRecent && node.type === "paper" && highlightClusters) {
      ctx.shadowBlur = 15
      ctx.shadowColor = node.color || "#3b82f6"
    } else {
      ctx.shadowBlur = 0
    }

    // Draw node
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
    ctx.globalAlpha = opacity
    ctx.fillStyle = node.color || "#94a3b8"
    ctx.fill()

    // Border - thicker for highlighted/selected
    if (isSelected) {
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 3.5
    } else if (isHighlighted) {
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 2.5
    } else {
      ctx.strokeStyle = isRecent ? "#fff" : "rgba(255,255,255,0.6)"
      ctx.lineWidth = isRecent ? 2.5 : 1.5
    }
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1.0

    // Labels for important or highlighted nodes
    if ((size > 12 || isHighlighted || isSelected) && globalScale > 1.2) {
      ctx.globalAlpha = isDimmed ? 0.4 : 1.0
      ctx.font = `${Math.max(3, size / 3)}px Sans-Serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = "#fff"
      const maxChars = Math.floor(size / 1.5)
      ctx.fillText(node.label.substring(0, maxChars), node.x, node.y)
      ctx.globalAlpha = 1.0
    }
  }

  const paintLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const sourceId = typeof link.source === "object" ? link.source.id : link.source
      const targetId = typeof link.target === "object" ? link.target.id : link.target
      const linkId = `${sourceId}-${targetId}`
      const isHighlighted = highlightLinks.has(linkId)
      const isDimmed = highlightLinks.size > 0 && !isHighlighted

      // Get source and target positions
      const start = link.source
      const end = link.target

      if (!start || !end) return

      // Link styling based on type and highlight
      const baseWidth = calculateLinkWidth(link.type, start, end)
      const width = isHighlighted ? baseWidth * 2 : baseWidth
      const opacity = isDimmed ? 0.1 : link.type === "cited" ? 0.5 : 0.3

      ctx.globalAlpha = opacity
      ctx.strokeStyle = link.type === "cited" ? "#60a5fa" : "#94a3b8"
      ctx.lineWidth = width

      // Draw link
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.stroke()
      ctx.globalAlpha = 1.0

      // Draw arrow for citation links if enabled
      if (showArrows && link.type === "cited") {
        const arrowLength = 8
        const arrowWidth = 5
        const angle = Math.atan2(end.y - start.y, end.x - start.x)

        // Position arrow at 70% along the link
        const arrowPos = 0.7
        const arrowX = start.x + (end.x - start.x) * arrowPos
        const arrowY = start.y + (end.y - start.y) * arrowPos

        ctx.save()
        ctx.translate(arrowX, arrowY)
        ctx.rotate(angle)

        ctx.globalAlpha = opacity
        ctx.fillStyle = "#60a5fa"
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(-arrowLength, arrowWidth)
        ctx.lineTo(-arrowLength, -arrowWidth)
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = 1.0

        ctx.restore()
      }

      // Draw link label if enabled and highlighted
      if (showLinkLabels && isHighlighted && link.citationCount && link.citationCount > 1) {
        const midX = (start.x + end.x) / 2
        const midY = (start.y + end.y) / 2

        ctx.font = "10px Sans-Serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        // Background for label
        const label = `${link.citationCount}x`
        const metrics = ctx.measureText(label)
        const padding = 3

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
        ctx.fillRect(midX - metrics.width / 2 - padding, midY - 6, metrics.width + padding * 2, 12)

        ctx.fillStyle = "#fff"
        ctx.fillText(label, midX, midY)
      }
    },
    [highlightLinks, showArrows, showLinkLabels]
  )

  const exportNetwork = (format: "png" | "json" = "png") => {
    if (!graphRef.current || !networkData) return

    if (format === "png") {
      const canvas = graphRef.current.renderer().domElement
      const link = document.createElement("a")
      link.download = `network-${selectedCollection}-${Date.now()}.png`
      link.href = canvas.toDataURL()
      link.click()
      toast({
        title: "Network exported",
        description: "PNG image downloaded successfully",
      })
    } else {
      // Export as JSON with node positions
      const exportData = {
        nodes: networkData.nodes.map((node) => ({
          id: node.id,
          label: node.label,
          type: node.type,
          citations: node.citations,
          year: node.year,
          field: node.field,
          color: node.color,
          x: node.x,
          y: node.y,
          fx: node.fx,
          fy: node.fy,
        })),
        links: networkData.links.map((link) => ({
          source: typeof link.source === "object" ? link.source.id : link.source,
          target: typeof link.target === "object" ? link.target.id : link.target,
          type: link.type,
          weight: link.weight,
          citationCount: link.citationCount,
        })),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.download = `network-data-${selectedCollection}-${Date.now()}.json`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Network data exported",
        description: "JSON data with node positions downloaded",
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
                            <SelectItem key={col.id} value={col.id || "default-collection"}>
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

                          <div className="border-t pt-4 space-y-4">
                            <div className="flex items-center gap-2">
                              <Filter className="w-4 h-4 text-muted-foreground" />
                              <h4 className="font-medium text-sm">Advanced Features</h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="show-arrows" className="text-sm">
                                  Directional Arrows
                                </Label>
                                <Switch id="show-arrows" checked={showArrows} onCheckedChange={setShowArrows} />
                              </div>

                              <div className="flex items-center justify-between">
                                <Label htmlFor="curved-links" className="text-sm">
                                  Curved Links
                                </Label>
                                <Switch
                                  id="curved-links"
                                  checked={enableCurvedLinks}
                                  onCheckedChange={setEnableCurvedLinks}
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <Label htmlFor="link-labels" className="text-sm">
                                  Link Labels
                                </Label>
                                <Switch
                                  id="link-labels"
                                  checked={showLinkLabels}
                                  onCheckedChange={setShowLinkLabels}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm">Layout Mode</Label>
                              <Select value={dagMode} onValueChange={setDagMode}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Force-directed (default)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="default">Force-directed (default)</SelectItem>
                                  <SelectItem value="td">Top-Down (DAG)</SelectItem>
                                  <SelectItem value="bu">Bottom-Up (DAG)</SelectItem>
                                  <SelectItem value="lr">Left-Right (DAG)</SelectItem>
                                  <SelectItem value="rl">Right-Left (DAG)</SelectItem>
                                  <SelectItem value="radialout">Radial Outward</SelectItem>
                                  <SelectItem value="radialin">Radial Inward</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                DAG modes work best for chronological citation networks
                              </p>
                            </div>
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
                            <>
                              <Button variant="outline" onClick={() => exportNetwork("png")}>
                                <Download className="w-4 h-4 mr-2" />
                                Export PNG
                              </Button>
                              <Button variant="outline" onClick={() => exportNetwork("json")}>
                                <Download className="w-4 h-4 mr-2" />
                                Export Data
                              </Button>
                            </>
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
                                  {selectedNodes.size > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedNodes(new Set())
                                        setHighlightNodes(new Set())
                                        setHighlightLinks(new Set())
                                      }}
                                    >
                                      <Focus className="w-4 h-4 mr-1" />
                                      Clear ({selectedNodes.size})
                                    </Button>
                                  )}
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
                                // Node rendering
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
                                        ${selectedNodes.size > 0 ? '<div style="color: #3b82f6; margin-top: 4px; font-size: 10px;">💡 Ctrl+click to multi-select</div>' : ""}
                                        ${node.doi ? '<div style="color: #3b82f6; margin-top: 4px; font-size: 10px;">🔗 Double-click to open DOI</div>' : ""}
                                      </div>
                                    `
                                  }
                                  return `<div style="background: rgba(0,0,0,0.85); color: white; padding: 6px 10px; border-radius: 6px; font-size: 11px;">${node.label}</div>`
                                }}
                                // Link rendering
                                linkCanvasObject={paintLink}
                                linkCanvasObjectMode={() => "replace"}
                                linkWidth={(link: any) => {
                                  const sourceNode =
                                    typeof link.source === "object"
                                      ? link.source
                                      : networkData.nodes.find((n) => n.id === link.source)
                                  const targetNode =
                                    typeof link.target === "object"
                                      ? link.target
                                      : networkData.nodes.find((n) => n.id === link.target)
                                  return calculateLinkWidth(link.type, sourceNode, targetNode)
                                }}
                                linkColor={(link: any) => (link.type === "cited" ? "#3b82f6" : "#d1d5db")}
                                linkCurvature={enableCurvedLinks ? 0.2 : 0}
                                linkDirectionalParticles={(link: any) => (link.type === "cited" && !showArrows ? 2 : 0)}
                                linkDirectionalParticleWidth={2.5}
                                linkDirectionalParticleSpeed={0.005}
                                linkLabel={(link: any) => {
                                  if (link.citationCount && link.citationCount > 1) {
                                    return `Cited ${link.citationCount} times`
                                  }
                                  return ""
                                }}
                                // Interaction handlers
                                onNodeClick={handleNodeClick}
                                onNodeDoubleClick={handleNodeDoubleClick}
                                onNodeHover={handleNodeHover}
                                onNodeDragEnd={handleNodeDragEnd}
                                onLinkHover={handleLinkHover}
                                onNodeRightClick={(node: any) => {
                                  // Pin/unpin node on right-click
                                  if (node.fx === undefined) {
                                    node.fx = node.x
                                    node.fy = node.y
                                    toast({
                                      title: "Node pinned",
                                      description: "Right-click again to unpin",
                                    })
                                  } else {
                                    node.fx = undefined
                                    node.fy = undefined
                                    toast({
                                      title: "Node unpinned",
                                      description: "Node will respond to forces",
                                    })
                                  }
                                }}
                                onBackgroundClick={() => {
                                  setSelectedNodes(new Set())
                                  setHighlightNodes(new Set())
                                  setHighlightLinks(new Set())
                                }}
                                // Force engine configuration
                                dagMode={dagMode || undefined}
                                dagLevelDistance={80}
                                d3AlphaDecay={0.15}
                                d3VelocityDecay={0.3}
                                warmupTicks={60}
                                cooldownTicks={200}
                                width={1100}
                                height={700}
                                backgroundColor="#f8fafc"
                                enableNodeDrag={true}
                                enableZoomInteraction={true}
                                enablePanInteraction={true}
                                enablePointerInteraction={true}
                                autoPauseRedraw={true}
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
                              <p className="font-medium mb-2">💡 Interaction Guide:</p>
                              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                <div>
                                  <span className="font-semibold">Click node:</span> Focus & center view
                                </div>
                                <div>
                                  <span className="font-semibold">Ctrl+click:</span> Multi-select nodes
                                </div>
                                <div>
                                  <span className="font-semibold">Hover node:</span> Highlight connections
                                </div>
                                <div>
                                  <span className="font-semibold">Right-click:</span> Pin/unpin position
                                </div>
                                <div>
                                  <span className="font-semibold">Drag node:</span> Auto-fixes after release
                                </div>
                                <div>
                                  <span className="font-semibold">Double-click paper:</span> Opens DOI link
                                </div>
                                <div>
                                  <span className="font-semibold">Hover link:</span> View citation info
                                </div>
                                <div>
                                  <span className="font-semibold">Background click:</span> Clear selection
                                </div>
                              </div>
                              {selectedNodes.size > 0 && (
                                <div className="mt-2 pt-2 border-t border-blue-200">
                                  <span className="font-semibold text-blue-700">
                                    {selectedNodes.size} node{selectedNodes.size > 1 ? "s" : ""} selected
                                  </span>
                                </div>
                              )}
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
