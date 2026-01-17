import { type NextRequest, NextResponse } from "next/server"
import { getEnhancedCitationNetwork } from "@/lib/api-services"

const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes for citations

export const runtime = "edge"

export async function GET(request: NextRequest, { params }: { params: { paperId: string } }) {
  try {
    const paperId = params.paperId
    const doi = request.nextUrl.searchParams.get("doi") || undefined

    const cacheKey = `citations:${paperId}:${doi || "no-doi"}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    const citations = await getEnhancedCitationNetwork(paperId, doi)

    cache.set(cacheKey, {
      data: citations,
      timestamp: Date.now(),
    })

    return NextResponse.json(citations)
  } catch (error) {
    console.error("[API Route] Citations error:", error)
    return NextResponse.json({ error: "Failed to fetch citations" }, { status: 500 })
  }
}
