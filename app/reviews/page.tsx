"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Sparkles, FileText, Trash2 } from "lucide-react"
import {
  getLiteratureReviews,
  saveLiteratureReview,
  deleteLiteratureReview,
  type StoredLiteratureReview,
} from "@/lib/api-client"

export default function ReviewsPage() {
  const [researchQuestion, setResearchQuestion] = useState("")
  const [title, setTitle] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [review, setReview] = useState<string>("")
  const [savedReviews, setSavedReviews] = useState<StoredLiteratureReview[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    setIsLoading(true)
    const data = await getLiteratureReviews()
    setSavedReviews(data)
    setIsLoading(false)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const generatedContent = `This is a comprehensive literature review addressing: ${researchQuestion}\n\nKey findings and themes have been identified across the research landscape.`
    setReview(generatedContent)
    setIsGenerating(false)
  }

  const handleSave = async () => {
    if (!title.trim() || !review.trim()) return

    try {
      await saveLiteratureReview({
        title,
        researchQuestion,
        content: { text: review },
        paperIds: [],
      })
      await loadReviews()
      setTitle("")
      setResearchQuestion("")
      setReview("")
    } catch (error) {
      console.error("[Reviews] Failed to save:", error)
      alert("Failed to save review. Please try again.")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteLiteratureReview(id)
      await loadReviews()
    } catch (error) {
      console.error("[Reviews] Failed to delete:", error)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Header />

        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Literature Review Generator</h1>
              <p className="text-muted-foreground">AI-powered synthesis of academic literature</p>
            </div>

            <Card className="p-8 mb-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., AI in Customer Experience"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Research Question</Label>
                  <Textarea
                    value={researchQuestion}
                    onChange={(e) => setResearchQuestion(e.target.value)}
                    placeholder="e.g., How does AI impact customer experience personalization?"
                    rows={3}
                  />
                </div>

                {review && (
                  <div className="space-y-2">
                    <Label>Generated Review</Label>
                    <Textarea value={review} onChange={(e) => setReview(e.target.value)} rows={8} />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleGenerate}
                    disabled={!researchQuestion || isGenerating}
                    className="flex-1"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Review
                      </>
                    )}
                  </Button>
                  {review && (
                    <Button onClick={handleSave} disabled={!title.trim()} size="lg" variant="secondary">
                      Save to Database
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Saved Reviews</h2>
              {isLoading ? (
                <p className="text-muted-foreground">Loading reviews...</p>
              ) : savedReviews.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No saved reviews yet. Generate and save one above!</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {savedReviews.map((savedReview) => (
                    <Card key={savedReview.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <FileText className="w-5 h-5 text-accent mt-1" />
                          <div>
                            <h3 className="font-semibold">{savedReview.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{savedReview.research_question}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Created {new Date(savedReview.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(savedReview.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
