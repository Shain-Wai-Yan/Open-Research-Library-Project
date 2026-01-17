"use client"

import { useState } from "react"
import { Lightbulb, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { saveInsight } from "@/lib/api-client"
import type { AtomicInsight } from "@/lib/types"

interface InsightEditorProps {
  paperId: string
  onSave?: () => void
}

export function InsightEditor({ paperId, onSave }: InsightEditorProps) {
  const [content, setContent] = useState("")
  const [type, setType] = useState<AtomicInsight["type"]>("concept")
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveInsight({
        paperId,
        type,
        content,
        relatedInsights: [],
        tags: [],
      })
      setContent("")
      onSave?.()
    } catch (error) {
      console.error("[InsightEditor] Failed to save:", error)
      alert("Failed to save insight. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-accent" />
          <h3 className="font-semibold">Add Atomic Insight</h3>
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as AtomicInsight["type"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concept">Concept</SelectItem>
              <SelectItem value="method">Method</SelectItem>
              <SelectItem value="claim">Claim</SelectItem>
              <SelectItem value="limitation">Limitation</SelectItem>
              <SelectItem value="gap">Research Gap</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Insight (3-5 sentences)</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What key insight did you extract from this paper?"
            rows={5}
          />
        </div>

        <Button onClick={handleSave} className="w-full" disabled={!content.trim() || isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Insight"}
        </Button>
      </div>
    </Card>
  )
}
