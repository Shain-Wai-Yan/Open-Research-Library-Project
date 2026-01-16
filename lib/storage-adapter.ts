import type { Collection, AtomicInsight } from "./types"

/**
 * Storage adapter that uses server-side API routes with service role key
 * Falls back to localStorage if API is unavailable
 */

const API_BASE = "/api"

// ============================================================================
// Collections
// ============================================================================

export async function getCollections(): Promise<Collection[]> {
  try {
    const response = await fetch(`${API_BASE}/collections`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    return data.map(
      (row: {
        id: string
        name: string
        description?: string
        color: string
        created_at: string
        updated_at?: string
      }) => ({
        id: row.id,
        name: row.name,
        description: row.description || "",
        color: row.color,
        paperIds: [],
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
      }),
    )
  } catch (err) {
    console.error("[Storage] API error, using localStorage:", err)
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("orl_collections")
    return data ? JSON.parse(data) : []
  }
}

export async function saveCollection(
  collection: Omit<Collection, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<Collection> {
  try {
    const response = await fetch(`${API_BASE}/collections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        color: collection.color,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      color: data.color,
      paperIds: [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch (err) {
    console.error("[Storage] API error, using localStorage:", err)
    const collections = await getCollections()
    const newCollection: Collection = {
      ...collection,
      id: collection.id || `col-${Date.now()}`,
      paperIds: collection.paperIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const index = collections.findIndex((c) => c.id === newCollection.id)
    if (index >= 0) {
      collections[index] = newCollection
    } else {
      collections.push(newCollection)
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("orl_collections", JSON.stringify(collections))
    }
    return newCollection
  }
}

export async function deleteCollection(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/collections?id=${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
  } catch (err) {
    console.error("[Storage] API error, using localStorage:", err)
    const collections = await getCollections()
    const filtered = collections.filter((c) => c.id !== id)
    if (typeof window !== "undefined") {
      localStorage.setItem("orl_collections", JSON.stringify(filtered))
    }
  }
}

// ============================================================================
// Insights
// ============================================================================

export async function getInsights(paperId?: string): Promise<AtomicInsight[]> {
  try {
    const url = paperId ? `${API_BASE}/insights?paperId=${paperId}` : `${API_BASE}/insights`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    return data.map((row: { id: string; paper_id: string; type: string; content: string; created_at: string }) => ({
      id: row.id,
      paperId: row.paper_id,
      type: row.type,
      content: row.content,
      relatedInsights: [],
      tags: [],
      createdAt: row.created_at,
    }))
  } catch (err) {
    console.error("[Storage] API error, using localStorage:", err)
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("orl_insights")
    const insights = data ? JSON.parse(data) : []
    return paperId ? insights.filter((i: AtomicInsight) => i.paperId === paperId) : insights
  }
}

export async function saveInsight(
  insight: Omit<AtomicInsight, "id" | "createdAt"> & { id?: string },
): Promise<AtomicInsight> {
  try {
    const response = await fetch(`${API_BASE}/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paperId: insight.paperId,
        type: insight.type,
        content: insight.content,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      id: data.id,
      paperId: data.paper_id,
      type: data.type,
      content: data.content,
      relatedInsights: insight.relatedInsights || [],
      tags: insight.tags || [],
      createdAt: data.created_at,
    }
  } catch (err) {
    console.error("[Storage] API error, using localStorage:", err)
    const insights = await getInsights()
    const newInsight: AtomicInsight = {
      ...insight,
      id: insight.id || `insight-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }

    const index = insights.findIndex((i) => i.id === newInsight.id)
    if (index >= 0) {
      insights[index] = newInsight
    } else {
      insights.push(newInsight)
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("orl_insights", JSON.stringify(insights))
    }
    return newInsight
  }
}

export async function deleteInsight(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/insights?id=${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
  } catch (err) {
    console.error("[Storage] API error, using localStorage:", err)
    const insights = await getInsights()
    const filtered = insights.filter((i) => i.id !== id)
    if (typeof window !== "undefined") {
      localStorage.setItem("orl_insights", JSON.stringify(filtered))
    }
  }
}
