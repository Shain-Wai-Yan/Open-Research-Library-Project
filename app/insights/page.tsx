"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getInsights } from "@/lib/api-client"
import type { AtomicInsight } from "@/lib/types"
import { Lightbulb, Beaker, MessageSquare, AlertCircle, Search, Plus } from "lucide-react"
import { InsightEditor } from "@/components/insights/insight-editor"

const INSIGHT_ICONS = {
  concept: Lightbulb,
  method: Beaker,
  claim: MessageSquare,
  limitation: AlertCircle,
  gap: Search,
}

const INSIGHT_COLORS = {
  concept: "bg-blue-100 text-blue-700 border-blue-300",
  method: "bg-green-100 text-green-700 border-green-300",
  claim: "bg-purple-100 text-purple-700 border-purple-300",
  limitation: "bg-orange-100 text-orange-700 border-orange-300",
  gap: "bg-rose-100 text-rose-700 border-rose-300",
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<AtomicInsight[]>([])
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadInsights()
  }, [])

  const loadInsights = async () => {
    setIsLoading(true)
    try {
      const data = await getInsights()
      setInsights(data)
    } catch (error) {
      console.error("[Insights] Failed to load:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInsightSaved = () => {
    loadInsights()
    setIsEditorOpen(false)
  }

  const groupedInsights = insights.reduce(
    (acc, insight) => {
      if (!acc[insight.type]) acc[insight.type] = []
      acc[insight.type].push(insight)
      return acc
    },
    {} as Record<string, AtomicInsight[]>,
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Header />

        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Atomic Insights</h1>
                <p className="text-muted-foreground">Your personal knowledge graph of research insights</p>
              </div>
              <Button onClick={() => setIsEditorOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Insight
              </Button>
            </div>

            {isLoading ? (
              <Card className="p-16 text-center">
                <p className="text-muted-foreground">Loading insights...</p>
              </Card>
            ) : insights.length === 0 ? (
              <Card className="p-16 text-center">
                <Lightbulb className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No insights yet</h3>
                <p className="text-muted-foreground mb-4">Start capturing atomic insights from papers you read</p>
                <Button onClick={() => setIsEditorOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Insight
                </Button>
              </Card>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedInsights).map(([type, typeInsights]) => {
                  const Icon = INSIGHT_ICONS[type as keyof typeof INSIGHT_ICONS]
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-4">
                        <Icon className="w-5 h-5 text-accent" />
                        <h2 className="text-xl font-semibold capitalize">
                          {type === "gap" ? "Research Gaps" : type + "s"}
                        </h2>
                        <Badge variant="secondary">{typeInsights.length}</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {typeInsights.map((insight) => (
                          <Card
                            key={insight.id}
                            className={`p-4 border-l-4 ${INSIGHT_COLORS[type as keyof typeof INSIGHT_COLORS]}`}
                          >
                            <p className="text-sm leading-relaxed">{insight.content}</p>
                            <div className="mt-3 flex items-center justify-between">
                              <div className="text-xs text-muted-foreground">
                                {new Date(insight.createdAt).toLocaleDateString()}
                              </div>
                              {insight.paperId && (
                                <Badge variant="outline" className="text-xs">
                                  Linked to paper
                                </Badge>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {isEditorOpen && <InsightEditor onSave={handleInsightSaved} onCancel={() => setIsEditorOpen(false)} />}
    </div>
  )
}
