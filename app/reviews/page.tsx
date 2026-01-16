"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles } from "lucide-react"
import { generateLiteratureReview } from "@/lib/mock-api"
import type { LiteratureReview } from "@/lib/types"

export default function ReviewsPage() {
  const [researchQuestion, setResearchQuestion] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [review, setReview] = useState<LiteratureReview | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    const generated = await generateLiteratureReview(researchQuestion, [])
    setReview(generated)
    setIsGenerating(false)
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

            {!review ? (
              <Card className="p-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Research Question</Label>
                    <Textarea
                      value={researchQuestion}
                      onChange={(e) => setResearchQuestion(e.target.value)}
                      placeholder="e.g., How does AI impact customer experience personalization?"
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={!researchQuestion || isGenerating}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>Generating Review...</>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Literature Review
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="p-8">
                  <h2 className="text-2xl font-serif font-bold mb-4">{review.title}</h2>
                  <p className="text-sm text-muted-foreground mb-6">Research Question: {review.researchQuestion}</p>

                  <div className="space-y-8">
                    {review.sections.map((section, idx) => (
                      <div key={idx}>
                        <h3 className="text-xl font-semibold mb-3">{section.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Button variant="outline" onClick={() => setReview(null)} className="w-full">
                  Generate New Review
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
