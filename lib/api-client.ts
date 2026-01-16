// Production API Client - Now uses real APIs instead of mock data
import type { Paper, Collection, Note, AtomicInsight, TopicCluster, SearchFilters, LiteratureReview } from "./types"
import { searchAllSources, getEnhancedCitationNetwork, enhancePaperWithPDF } from "./api-services"

// ============================================================================
// MAIN API FUNCTIONS - Now powered by 8 real research APIs
// ============================================================================

/**
 * Search papers across 8 sources: OpenAlex, Semantic Scholar, arXiv,
 * Crossref, OpenCitations, Unpaywall, CORE, and PubMed
 */
export async function searchPapers(query: string, filters?: SearchFilters): Promise<Paper[]> {
  try {
    return await searchAllSources(query, filters)
  } catch (error) {
    console.error("[API Client] Search error:", error)
    return []
  }
}

/**
 * Get detailed information about a specific paper
 * Enhanced with PDF access via Unpaywall
 */
export async function getPaperById(id: string): Promise<Paper | null> {
  try {
    // For now, we'll search by ID - you can enhance this later
    const results = await searchAllSources(id)
    if (results.length === 0) return null

    const paper = results[0]
    return await enhancePaperWithPDF(paper)
  } catch (error) {
    console.error("[API Client] Paper fetch error:", error)
    return null
  }
}

/**
 * Get citation network using Semantic Scholar + OpenCitations
 */
export async function getCitationNetwork(paperId: string, doi?: string) {
  try {
    return await getEnhancedCitationNetwork(paperId, doi)
  } catch (error) {
    console.error("[API Client] Citation network error:", error)
    return { citations: [], references: [], citationCount: 0, referenceCount: 0 }
  }
}

/**
 * Analyze papers and generate topic clusters
 * Uses client-side clustering algorithm
 */
export async function getTopicClusters(paperIds: string[]): Promise<TopicCluster[]> {
  try {
    // This will use client-side clustering based on paper keywords
    // You can enhance this with ML clustering later
    const papers = await Promise.all(paperIds.map((id) => getPaperById(id)))
    const validPapers = papers.filter((p): p is Paper => p !== null)

    // Group by common keywords
    const clusters = new Map<string, Paper[]>()

    for (const paper of validPapers) {
      const mainField = paper.fieldsOfStudy[0] || "General"
      if (!clusters.has(mainField)) {
        clusters.set(mainField, [])
      }
      clusters.get(mainField)!.push(paper)
    }

    return Array.from(clusters.entries()).map(([name, papers], index) => ({
      id: `cluster-${index}`,
      name,
      papers,
      keywords: papers.flatMap((p) => p.fieldsOfStudy).filter((k, i, arr) => arr.indexOf(k) === i),
      centralPaperId: papers[0].id,
    }))
  } catch (error) {
    console.error("[API Client] Cluster analysis error:", error)
    return []
  }
}

/**
 * Generate AI-powered literature review
 * This would connect to your AI backend or use OpenAI/Anthropic directly
 */
export async function generateLiteratureReview(
  researchQuestion: string,
  paperIds: string[],
): Promise<LiteratureReview> {
  try {
    // For now, returns a structured template
    // You can integrate with OpenAI/Anthropic API for real synthesis
    const papers = await Promise.all(paperIds.map((id) => getPaperById(id)))
    const validPapers = papers.filter((p): p is Paper => p !== null)

    return {
      id: `review-${Date.now()}`,
      title: `Literature Review: ${researchQuestion}`,
      researchQuestion,
      sections: [
        {
          title: "Introduction",
          content: `This review examines ${validPapers.length} papers related to: ${researchQuestion}`,
          citations: validPapers.slice(0, 3).map((p) => p.id),
          type: "introduction",
        },
        {
          title: "Key Themes",
          content: "The literature reveals several important themes...",
          citations: validPapers.map((p) => p.id),
          type: "theme",
        },
        {
          title: "Research Gaps",
          content: "Several gaps exist in the current literature...",
          citations: [],
          type: "gaps",
        },
      ],
      papers: validPapers,
      createdAt: new Date().toISOString(),
      status: "complete",
    }
  } catch (error) {
    console.error("[API Client] Review generation error:", error)
    throw error
  }
}

// ============================================================================
// LOCAL STORAGE API - For user-specific data (collections, notes, insights)
// These stay in localStorage until you add Supabase
// ============================================================================

export const localStorageAPI = {
  // Collections
  getCollections(): Collection[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("orl_collections")
    return data ? JSON.parse(data) : []
  },

  saveCollection(collection: Collection) {
    const collections = this.getCollections()
    const index = collections.findIndex((c) => c.id === collection.id)
    if (index >= 0) {
      collections[index] = collection
    } else {
      collections.push(collection)
    }
    localStorage.setItem("orl_collections", JSON.stringify(collections))
  },

  deleteCollection(id: string) {
    const collections = this.getCollections().filter((c) => c.id !== id)
    localStorage.setItem("orl_collections", JSON.stringify(collections))
  },

  // Notes
  getNotes(paperId?: string): Note[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("orl_notes")
    const notes = data ? JSON.parse(data) : []
    return paperId ? notes.filter((n: Note) => n.paperId === paperId) : notes
  },

  saveNote(note: Note) {
    const notes = this.getNotes()
    const index = notes.findIndex((n) => n.id === note.id)
    if (index >= 0) {
      notes[index] = note
    } else {
      notes.push(note)
    }
    localStorage.setItem("orl_notes", JSON.stringify(notes))
  },

  // Atomic Insights
  getInsights(paperId?: string): AtomicInsight[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("orl_insights")
    const insights = data ? JSON.parse(data) : []
    return paperId ? insights.filter((i: AtomicInsight) => i.paperId === paperId) : insights
  },

  saveInsight(insight: AtomicInsight) {
    const insights = this.getInsights()
    const index = insights.findIndex((i) => i.id === insight.id)
    if (index >= 0) {
      insights[index] = insight
    } else {
      insights.push(insight)
    }
    localStorage.setItem("orl_insights", JSON.stringify(insights))
  },

  deleteInsight(id: string) {
    const insights = this.getInsights().filter((i) => i.id !== id)
    localStorage.setItem("orl_insights", JSON.stringify(insights))
  },
}
