import { getSupabaseClient, isSupabaseConfigured } from "./supabase-client"
import type { Collection, AtomicInsight } from "./types"

/**
 * Storage adapter that automatically switches between Supabase and localStorage
 * If Supabase is configured, uses cloud storage. Otherwise falls back to localStorage.
 */

// ============================================================================
// Collections
// ============================================================================

export async function getCollections(): Promise<Collection[]> {
  if (!isSupabaseConfigured()) {
    // LocalStorage fallback
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("orl_collections")
    return data ? JSON.parse(data) : []
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] No authenticated user, using localStorage")
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("orl_collections")
    return data ? JSON.parse(data) : []
  }

  const { data, error } = await supabase.from("collections").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("[Storage] Error fetching collections:", error)
    return []
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || "",
    color: row.color as any,
    paperIds: [], // Will be populated from saved_papers table
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  }))
}

export async function saveCollection(
  collection: Omit<Collection, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<Collection> {
  console.log("[v0] Saving collection:", collection)

  if (!isSupabaseConfigured()) {
    console.log("[v0] Supabase not configured, using localStorage")
    // LocalStorage fallback
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

    localStorage.setItem("orl_collections", JSON.stringify(collections))
    console.log("[v0] Saved to localStorage:", newCollection)
    return newCollection
  }

  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase not configured")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] No authenticated user, falling back to localStorage")
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

    localStorage.setItem("orl_collections", JSON.stringify(collections))
    return newCollection
  }

  if (collection.id) {
    // Update existing
    const { data, error } = await supabase
      .from("collections")
      .update({
        name: collection.name,
        description: collection.description,
        color: collection.color,
        updated_at: new Date().toISOString(),
      })
      .eq("id", collection.id)
      .select()
      .single()

    if (error) throw error
    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      color: data.color as any,
      paperIds: [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } else {
    // Create new
    const { data, error } = await supabase
      .from("collections")
      .insert({
        user_id: user.id,
        name: collection.name,
        description: collection.description,
        color: collection.color,
      })
      .select()
      .single()

    if (error) throw error
    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      color: data.color as any,
      paperIds: [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }
}

export async function deleteCollection(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    // LocalStorage fallback
    const collections = await getCollections()
    const filtered = collections.filter((c) => c.id !== id)
    localStorage.setItem("orl_collections", JSON.stringify(filtered))
    return
  }

  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase not configured")

  const { error } = await supabase.from("collections").delete().eq("id", id)

  if (error) throw error
}

// ============================================================================
// Insights
// ============================================================================

export async function getInsights(paperId?: string): Promise<AtomicInsight[]> {
  if (!isSupabaseConfigured()) {
    // LocalStorage fallback
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("orl_insights")
    const insights = data ? JSON.parse(data) : []
    return paperId ? insights.filter((i: AtomicInsight) => i.paperId === paperId) : insights
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

  let query = supabase.from("insights").select("*").order("created_at", { ascending: false })

  if (paperId) {
    query = query.eq("paper_id", paperId)
  }

  const { data, error } = await query

  if (error) {
    console.error("[Storage] Error fetching insights:", error)
    return []
  }

  return data.map((row) => ({
    id: row.id,
    paperId: row.paper_id,
    type: row.type,
    content: row.content,
    createdAt: row.created_at,
  }))
}

export async function saveInsight(
  insight: Omit<AtomicInsight, "id" | "createdAt"> & { id?: string },
): Promise<AtomicInsight> {
  if (!isSupabaseConfigured()) {
    // LocalStorage fallback
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

    localStorage.setItem("orl_insights", JSON.stringify(insights))
    return newInsight
  }

  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase not configured")

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("insights")
    .insert({
      user_id: user.id,
      paper_id: insight.paperId,
      type: insight.type,
      content: insight.content,
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    paperId: data.paper_id,
    type: data.type,
    content: data.content,
    createdAt: data.created_at,
  }
}

export async function deleteInsight(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    // LocalStorage fallback
    const insights = await getInsights()
    const filtered = insights.filter((i) => i.id !== id)
    localStorage.setItem("orl_insights", JSON.stringify(filtered))
    return
  }

  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase not configured")

  const { error } = await supabase.from("insights").delete().eq("id", id)

  if (error) throw error
}
