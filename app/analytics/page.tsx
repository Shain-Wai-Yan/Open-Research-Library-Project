"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { BarChart3, TrendingUp, BookOpen, Lightbulb } from "lucide-react"
import { getCollections, getInsights, getSavedPapers, getLiteratureReviews } from "@/lib/api-client"

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    papers: 0,
    insights: 0,
    collections: 0,
    reviews: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setIsLoading(true)
    try {
      const [collections, insights, papers, reviews] = await Promise.all([
        getCollections(),
        getInsights(),
        getSavedPapers(),
        getLiteratureReviews(),
      ])

      setStats({
        papers: papers.length,
        insights: insights.length,
        collections: collections.length,
        reviews: reviews.length,
      })
    } catch (error) {
      console.error("[Analytics] Failed to load:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 lg:ml-64">
        <Header />

        <div className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">Research Analytics</h1>
              <p className="text-sm md:text-base text-muted-foreground">Track your research progress and impact</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <BookOpen className="w-8 h-8 text-blue-500" />
                  <span className="text-2xl font-bold">{isLoading ? "..." : stats.papers}</span>
                </div>
                <h3 className="font-semibold">Papers Saved</h3>
                <p className="text-sm text-muted-foreground">In collections</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Lightbulb className="w-8 h-8 text-amber-500" />
                  <span className="text-2xl font-bold">{isLoading ? "..." : stats.insights}</span>
                </div>
                <h3 className="font-semibold">Insights Captured</h3>
                <p className="text-sm text-muted-foreground">Total</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <BarChart3 className="w-8 h-8 text-green-500" />
                  <span className="text-2xl font-bold">{isLoading ? "..." : stats.collections}</span>
                </div>
                <h3 className="font-semibold">Collections</h3>
                <p className="text-sm text-muted-foreground">Organized</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                  <span className="text-2xl font-bold">{isLoading ? "..." : stats.reviews}</span>
                </div>
                <h3 className="font-semibold">Reviews Generated</h3>
                <p className="text-sm text-muted-foreground">Total</p>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
