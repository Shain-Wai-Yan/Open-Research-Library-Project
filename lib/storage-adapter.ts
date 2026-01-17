import type { Collection, AtomicInsight, Paper, ReviewSection } from "./types"

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

// ============================================================================
// ============================================================================

export interface SavedPaper {
  id: string
  collectionId: string
  paperId: string
  title: string
  authors: { name: string }[] | null
  year: number | null
  abstract: string | null
  citations: number
  doi: string | null
  pdfUrl: string | null
  source: string | null
  notes: string | null
  createdAt: string
}

export async function getSavedPapers(collectionId?: string): Promise<SavedPaper[]> {
  try {
    const url = collectionId ? `${API_BASE}/saved-papers?collectionId=${collectionId}` : `${API_BASE}/saved-papers`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    return data.map((row: any) => ({
      id: row.id,
      collectionId: row.collection_id,
      paperId: row.paper_id,
      title: row.title,
      authors: row.authors,
      year: row.year,
      abstract: row.abstract,
      citations: row.citations || 0,
      doi: row.doi,
      pdfUrl: row.pdf_url,
      source: row.source,
      notes: row.notes,
      createdAt: row.created_at,
    }))
  } catch (err) {
    console.error("[Storage] API error, using localStorage:", err)
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("orl_saved_papers")
    const papers = data ? JSON.parse(data) : []
    return collectionId ? papers.filter((p: SavedPaper) => p.collectionId === collectionId) : papers
  }
}

export async function savePaperToCollection(collectionId: string, paper: Paper, notes?: string): Promise<SavedPaper> {
  try {
    const response = await fetch(`${API_BASE}/saved-papers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collectionId,
        paperId: paper.id,
        title: paper.title,
        authors: paper.authors,
        year: paper.publicationDate ? new Date(paper.publicationDate).getFullYear() : null,
        abstract: paper.abstract,
        citations: paper.citationCount,
        doi: paper.doi,
        pdfUrl: paper.pdfUrl,
        source: paper.source,
        notes: notes || null,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      id: data.id,
      collectionId: data.collection_id,
      paperId: data.paper_id,
      title: data.title,
      authors: data.authors,
      year: data.year,
      abstract: data.abstract,
      citations: data.citations || 0,
      doi: data.doi,
      pdfUrl: data.pdf_url,
      source: data.source,
      notes: data.notes,
      createdAt: data.created_at,
    }
  } catch (err) {
    console.error("[Storage] API error, using localStorage:", err)
    const savedPapers = await getSavedPapers()
    const newSavedPaper: SavedPaper = {
      id: `saved-${Date.now()}`,
      collectionId,
      paperId: paper.id,
      title: paper.title,
      authors: paper.authors,
      year: paper.publicationDate ? new Date(paper.publicationDate).getFullYear() : null,
      abstract: paper.abstract,
      citations: paper.citationCount,
      doi: paper.doi || null,
      pdfUrl: paper.pdfUrl || null,
      source: paper.source,
      notes: notes || null,
      createdAt: new Date().toISOString(),
    }

    savedPapers.push(newSavedPaper)
    if (typeof window !== "undefined") {
      localStorage.setItem("orl_saved_papers", JSON.stringify(savedPapers))
    }
    return newSavedPaper
  }
}

export async function removePaperFromCollection(paperId: string, collectionId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/saved-papers?paperId=${paperId}&collectionId=${collectionId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
  } catch (err) {
    console.error("[Storage] API error, using localStorage:", err)
    const savedPapers = await getSavedPapers()
    const filtered = savedPapers.filter((p) => !(p.paperId === paperId && p.collectionId === collectionId))
    if (typeof window !== "undefined") {
      localStorage.setItem("orl_saved_papers", JSON.stringify(filtered))
    }
  }
}

export async function deleteSavedPaper(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/saved-papers?id=${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
  } catch (err) {
    console.error("[Storage] API error, using localStorage:", err)
    const savedPapers = await getSavedPapers()
    const filtered = savedPapers.filter((p) => p.id !== id)
    if (typeof window !== "undefined") {
      localStorage.setItem("orl_saved_papers", JSON.stringify(filtered))
    }
  }
}

// ============================================================================
// ============================================================================

export interface StoredLiteratureReview {
  id: string
  title: string
  researchQuestion: string
  content: {
    sections?: ReviewSection[]
    status?: "draft" | "complete"
  }
  paperIds: string[]
  createdAt: string
  updatedAt: string
}

export async function getLiteratureReviews(): Promise<StoredLiteratureReview[]> {
  try {
    const response = await fetch(`${API_BASE}/literature-reviews`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      researchQuestion: row.research_question,
      content: row.content || {},
      paperIds: row.paper_ids || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (err) {
    console.error("[Storage] API error, using localStorage:", err)
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("orl_literature_reviews")
    return data ? JSON.parse(data) : []
  }
}

export async function getLiteratureReviewById(id: string): Promise<StoredLiteratureReview | null> {
  try {
    const response = await fetch(`${API_BASE}/literature-reviews?id=${id}`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const row = await response.json()

    return {
      id: row.id,
      title: row.title,
      researchQuestion: row.research_question,
      content: row.content || {},
      paperIds: row.paper_ids || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  } catch (err) {
    console.error("[Storage] API error, using localStorage:", err)
    if (typeof window === "undefined") return null
    const data = localStorage.getItem("orl_literature_reviews")
    const reviews: StoredLiteratureReview[] = data ? JSON.parse(data) : []
    return reviews.find((r) => r.id === id) || null
  }
}

export async function saveLiteratureReview(
  review: Omit<StoredLiteratureReview, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<StoredLiteratureReview> {
  try {
    const response = await fetch(`${API_BASE}/literature-reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: review.id,
        title: review.title,
        researchQuestion: review.researchQuestion,
        content: review.content,
        paperIds: review.paperIds,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      id: data.id,
      title: data.title,
      researchQuestion: data.research_question,
      content: data.content || {},
      paperIds: data.paper_ids || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch (err) {
    console.error("[Storage] API error, using localStorage:", err)
    const reviews = await getLiteratureReviews()
    const newReview: StoredLiteratureReview = {
      ...review,
      id: review.id || `review-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const index = reviews.findIndex((r) => r.id === newReview.id)
    if (index >= 0) {
      reviews[index] = newReview
    } else {
      reviews.push(newReview)
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("orl_literature_reviews", JSON.stringify(reviews))
    }
    return newReview
  }
}

export async function deleteLiteratureReview(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/literature-reviews?id=${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
  } catch (err) {
    console.error("[Storage] API error, using localStorage:", err)
    const reviews = await getLiteratureReviews()
    const filtered = reviews.filter((r) => r.id !== id)
    if (typeof window !== "undefined") {
      localStorage.setItem("orl_literature_reviews", JSON.stringify(filtered))
    }
  }
}
