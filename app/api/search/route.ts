import { type NextRequest, NextResponse } from "next/server"
import { searchAllSources } from "@/lib/api-services"
import type { SearchFilters } from "@/lib/types"

// Simple in-memory cache (use Redis/KV for production)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const runtime = "edge"
export const maxDuration = 30

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "50")

    if (!query) {
      return NextResponse.json({ error: "Query required" }, { status: 400 })
    }

    // Parse filters from query params
    const filters: SearchFilters = {
      yearFrom: searchParams.get("yearFrom") ? Number.parseInt(searchParams.get("yearFrom")!) : undefined,
      yearTo: searchParams.get("yearTo") ? Number.parseInt(searchParams.get("yearTo")!) : undefined,
      minCitations: searchParams.get("minCitations") ? Number.parseInt(searchParams.get("minCitations")!) : undefined,
      openAccessOnly: searchParams.get("openAccessOnly") === "true",
      methodology: searchParams.get("methodology") || undefined,
      author: searchParams.get("author") || undefined,
      venue: searchParams.get("venue") || undefined,
      sortBy: (searchParams.get("sortBy") as any) || "relevance",
    }

    // Create cache key
    const cacheKey = `search:${query}:${page}:${JSON.stringify(filters)}`

    // Check cache
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("[API Route] Cache hit:", cacheKey)
      return NextResponse.json(cached.data)
    }

    console.log("[API Route] Cache miss, fetching:", cacheKey)

    // Fetch from APIs
    const results = await searchAllSources(query, filters, page, pageSize)

    // Store in cache
    cache.set(cacheKey, {
      data: results,
      timestamp: Date.now(),
    })

    // Clean old cache entries (keep last 100)
    if (cache.size > 100) {
      const sortedEntries = Array.from(cache.entries()).sort((a, b) => b[1].timestamp - a[1].timestamp)
      cache.clear()
      sortedEntries.slice(0, 100).forEach(([key, value]) => cache.set(key, value))
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("[API Route] Search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
