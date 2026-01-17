"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Network, AlertCircle } from "lucide-react"
import { getCollections, getSavedPapers } from "@/lib/api-client"

export default function NetworksPage() {
  const [collections, setCollections] = useState<any[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>("")
  const [papers, setPapers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

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
    try {
      const data = await getSavedPapers(collectionId)
      setPapers(data)
    } catch (error) {
      console.error("[Networks] Failed to load papers:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCollectionChange = (collectionId: string) => {
    setSelectedCollection(collectionId)
    loadPapers(collectionId)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Header />

        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Citation Networks</h1>
              <p className="text-muted-foreground">Visualize relationships between papers in your collections</p>
            </div>

            {collections.length === 0 ? (
              <Card className="p-16 text-center">
                <Network className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Collections Yet</h3>
                <p className="text-muted-foreground">
                  Create a collection and save papers to visualize citation networks
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
                  </div>
                </Card>

                {selectedCollection && (
                  <>
                    {isLoading ? (
                      <Card className="p-16 text-center">
                        <p className="text-muted-foreground">Loading papers...</p>
                      </Card>
                    ) : papers.length === 0 ? (
                      <Card className="p-16 text-center">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No Papers in Collection</h3>
                        <p className="text-muted-foreground">
                          Add papers to this collection to visualize their citation network
                        </p>
                      </Card>
                    ) : (
                      <Card className="p-8">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">Papers in Collection</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {papers.length} paper{papers.length !== 1 ? "s" : ""} saved
                            </p>
                          </div>
                          <Badge variant="secondary">Network Visualization Coming Soon</Badge>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {papers.map((paper) => (
                            <Card key={paper.id} className="p-4">
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm leading-tight">{paper.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {paper.authors && <span>{paper.authors.slice(0, 2).join(", ")}</span>}
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

                        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Network className="w-5 h-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <h4 className="text-sm font-medium mb-1">Citation Network Visualization</h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                This feature will display an interactive graph showing citation relationships between
                                papers. Papers that cite each other will be connected with edges, helping you discover
                                research clusters and key papers in your collection.
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
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
