"use client"

import React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sparkles, FileText, Trash2, Save, Zap, Brain, Search, AlertCircle, BookOpen, Copy, CheckCheck, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import {
  getLiteratureReviews,
  saveLiteratureReview,
  deleteLiteratureReview,
  type StoredLiteratureReview,
} from "@/lib/api-client"
import Loading from "./loading"

type AIModel = {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  speed: string
  recommended?: boolean
}

const AI_MODELS: AIModel[] = [
  {
    id: "deepseek-chat",
    name: "Quick Review",
    description: "Fast summaries with DeepSeek Chat (free, unlimited)",
    icon: <Zap className="w-4 h-4" />,
    speed: "Fast",
  },
  {
    id: "deepseek-reasoner",
    name: "Deep Research",
    description: "Comprehensive analysis with DeepSeek Reasoner (free, unlimited)",
    icon: <Brain className="w-4 h-4" />,
    speed: "Thorough",
    recommended: true,
  },
  {
    id: "groq-llama",
    name: "Professional Review",
    description: "Professional-grade with Llama 3.3 70B via Groq (14,400/day free)",
    icon: <Search className="w-4 h-4" />,
    speed: "Medium",
  },
  {
    id: "reasoning",
    name: "Analytical Review",
    description: "Advanced reasoning for complex analytical tasks",
    icon: <BookOpen className="w-4 h-4" />,
    speed: "Analytical",
  },
]

export default function ReviewsPage() {
  const searchParams = useSearchParams()
  const [researchQuestion, setResearchQuestion] = useState("")
  const [title, setTitle] = useState("")
  const [selectedModel, setSelectedModel] = useState("deepseek-reasoner")
  const [isGenerating, setIsGenerating] = useState(false)
  const [review, setReview] = useState<string>("")
  const [savedReviews, setSavedReviews] = useState<StoredLiteratureReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState("")
  const [copied, setCopied] = useState(false)
  const [selectedReview, setSelectedReview] = useState<StoredLiteratureReview | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadReviews()
  }, [])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight
    }
  }, [streamingText])

  const loadReviews = async () => {
    setIsLoading(true)
    const data = await getLiteratureReviews()
    setSavedReviews(data)
    setIsLoading(false)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setReview("")
    setStreamingText("")

    try {
      const response = await fetch('/api/generate-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          researchQuestion,
          model: selectedModel,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate review')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk
          setStreamingText(fullText)
        }
      }

      setReview(fullText)
      setStreamingText("")

      if (!title.trim()) {
        const shortTitle = researchQuestion.slice(0, 50) + (researchQuestion.length > 50 ? "..." : "")
        setTitle(shortTitle)
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate review. Please try again.")
    } finally {
      setIsGenerating(false)
    }
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
      setError(null)
    } catch (error) {
      setError("Failed to save review. Please try again.")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return

    try {
      await deleteLiteratureReview(id)
      await loadReviews()
    } catch (error) {
      setError("Failed to delete review. Please try again.")
    }
  }

  const handleCopy = async () => {
    if (review) {
      await navigator.clipboard.writeText(review)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const displayText = streamingText || review

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 lg:ml-64">
        <Header />

        <div className="p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            <div>
              <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Literature Review Generator</h1>
              <p className="text-lg text-muted-foreground">
                AI-powered synthesis with DeepSeek & Groq (100% free, unlimited)
              </p>
            </div>

            <Suspense fallback={<Loading />}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Generate New Review</span>
                    <Badge variant="secondary" className="text-xs">
                      AI Ready
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Enter your research question and select an AI model to generate a comprehensive literature review
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Review Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., AI in Customer Experience Management"
                      disabled={isGenerating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question">Research Question</Label>
                    <Textarea
                      id="question"
                      value={researchQuestion}
                      onChange={(e) => setResearchQuestion(e.target.value)}
                      placeholder="e.g., How does artificial intelligence impact customer experience personalization in e-commerce?"
                      rows={3}
                      disabled={isGenerating}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>AI Research Model</Label>
                    <RadioGroup value={selectedModel} onValueChange={setSelectedModel} disabled={isGenerating}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {AI_MODELS.map((model) => (
                          <label
                            key={model.id}
                            className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                              selectedModel === model.id
                                ? "border-accent bg-accent/5"
                                : "border-border hover:border-accent/50"
                            } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <RadioGroupItem value={model.id} id={model.id} className="mt-1" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {model.icon}
                                <span className="font-semibold text-sm">{model.name}</span>
                                {model.recommended && (
                                  <Badge variant="secondary" className="text-xs">
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">{model.description}</p>
                              <Badge variant="outline" className="text-xs">
                                {model.speed}
                              </Badge>
                            </div>
                          </label>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {displayText && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Generated Review</Label>
                        {!isGenerating && review && (
                          <Button variant="ghost" size="sm" onClick={handleCopy}>
                            {copied ? (
                              <>
                                <CheckCheck className="w-4 h-4 mr-2" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      <Card>
                        <CardContent className="p-6">
                          <ScrollArea className="h-[500px] w-full pr-4">
                            <MarkdownRenderer content={displayText} />
                          </ScrollArea>
                        </CardContent>
                      </Card>
                      {isGenerating && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="inline-block w-2 h-2 bg-accent rounded-full animate-pulse" />
                          Generating review with {AI_MODELS.find((m) => m.id === selectedModel)?.name}...
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={handleGenerate}
                      disabled={!researchQuestion.trim() || isGenerating}
                      className="flex-1"
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Generate Review
                        </>
                      )}
                    </Button>
                    {review && !isGenerating && (
                      <Button onClick={handleSave} disabled={!title.trim()} size="lg" variant="secondary">
                        <Save className="w-5 h-5 mr-2" />
                        Save to Database
                      </Button>
                    )}
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Using DeepSeek (primary, unlimited) with automatic fallback to Groq (14,400 requests/day). Both are 100% free forever.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </Suspense>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-semibold">Saved Reviews</h2>
                <Badge variant="secondary">{savedReviews.length} saved</Badge>
              </div>
              {isLoading ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Loading reviews...</p>
                  </CardContent>
                </Card>
              ) : savedReviews.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No saved reviews yet</h3>
                    <p className="text-muted-foreground text-sm">
                      Generate and save your first literature review above!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {savedReviews.map((savedReview) => (
                    <Card key={savedReview.id} className="hover:border-accent/50 transition-colors cursor-pointer">
                      <CardContent className="p-6" onClick={() => setSelectedReview(savedReview)}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-accent/10 shrink-0">
                              <FileText className="w-5 h-5 text-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg mb-1 truncate">{savedReview.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {savedReview.research_question}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>Created {new Date(savedReview.created_at).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>
                                  {savedReview.content?.text
                                    ? `${Math.ceil(savedReview.content.text.split(" ").length / 200)} min read`
                                    : "No content"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(savedReview.id)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Review Viewer Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">{selectedReview?.title}</DialogTitle>
            <DialogDescription className="text-base">{selectedReview?.research_question}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full pr-4">
            <div className="max-w-none">
              {selectedReview?.content?.text ? (
                <MarkdownRenderer content={selectedReview.content.text} />
              ) : (
                <p className="text-muted-foreground text-center py-8">No content available</p>
              )}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Created {selectedReview && new Date(selectedReview.created_at).toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedReview?.content?.text) {
                    navigator.clipboard.writeText(selectedReview.content.text)
                  }
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Content
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedReview(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
