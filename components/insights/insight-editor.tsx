"use client"

import { useState } from "react"
import { Lightbulb, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { saveInsight } from "@/lib/api-client"
import type { AtomicInsight } from "@/lib/types"

interface InsightEditorProps {
  paperId?: string
  onSave?: () => void
  onCancel?: () => void
}

export function InsightEditor({ paperId, onSave, onCancel }: InsightEditorProps) {
  const [content, setContent] = useState("")
  const [type, setType] = useState<AtomicInsight["type"]>("concept")
  const [isSaving, setIsSaving] = useState(false)
  const [customPaperId, setCustomPaperId] = useState("")

  const handleSave = async () => {
    setIsSaving(true)
    try {
      console.log("[v0] Saving insight to API...")
      const finalPaperId = paperId || customPaperId || `paper-${Date.now()}`

      await saveInsight({
        paperId: finalPaperId,
        type,
        content,
        relatedInsights: [],
        tags: [],
      })
      setContent("")
      setCustomPaperId("")
      console.log("[v0] Insight saved successfully")
      onSave?.()
    } catch (error) {
      console.error("[InsightEditor] Failed to save:", error)
      alert("Failed to save insight. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-accent" />
              <h3 className="font-semibold">Add Atomic Insight</h3>
            </div>
            {onCancel && (
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {!paperId && (
            <div className="space-y-2">
              <Label>Paper ID (optional)</Label>
              <input
                type="text"
                value={customPaperId}
                onChange={(e) => setCustomPaperId(e.target.value)}
                placeholder="Leave empty for general insight"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          )}

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

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1" disabled={!content.trim() || isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Insight"}
            </Button>
            {onCancel && (
              <Button onClick={onCancel} variant="outline">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
