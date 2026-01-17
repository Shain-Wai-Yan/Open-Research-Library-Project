import { type NextRequest, NextResponse } from "next/server"
import { searchAllSources, enhancePaperWithPDF } from "@/lib/api-services"

const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes for individual papers

export const runtime = "edge"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const paperId = params.id

    // Check cache
    const cacheKey = `paper:${paperId}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    // Fetch paper
    const results = await searchAllSources(paperId)
    if (results.papers.length === 0) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 })
    }

    const paper = await enhancePaperWithPDF(results.papers[0])

    // Cache result
    cache.set(cacheKey, {
      data: paper,
      timestamp: Date.now(),
    })

    return NextResponse.json(paper)
  } catch (error) {
    console.error("[API Route] Paper fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch paper" }, { status: 500 })
  }
}
