// Mock API layer - will be replaced with real backend calls
import type { Paper, Collection, Note, AtomicInsight, TopicCluster, SearchFilters } from "./types"

// Mock data
const MOCK_PAPERS: Paper[] = [
  {
    id: "1",
    title: "Deep Learning Approaches to Customer Experience Personalization",
    authors: [
      { id: "a1", name: "Sarah Chen", affiliations: ["MIT"] },
      { id: "a2", name: "Michael Rodriguez", affiliations: ["Stanford"] },
    ],
    abstract:
      "This paper explores novel deep learning architectures for personalizing customer experiences in real-time. We demonstrate a 34% improvement in customer satisfaction scores using transformer-based recommendation systems.",
    publicationDate: "2024-03-15",
    venue: "Journal of Marketing Research",
    citationCount: 47,
    referenceCount: 82,
    fieldsOfStudy: ["Marketing", "Artificial Intelligence", "Customer Experience"],
    pdfUrl: "/placeholder.pdf",
    doi: "10.1234/jmr.2024.001",
    source: "semantic-scholar",
    methodology: "experiment",
    openAccess: true,
  },
  {
    id: "2",
    title: "The Role of AI in Transforming Customer Relationship Management",
    authors: [
      { id: "a3", name: "David Thompson", affiliations: ["Harvard Business School"] },
      { id: "a4", name: "Emma Watson", affiliations: ["Oxford"] },
    ],
    abstract:
      "A comprehensive systematic review of AI applications in CRM systems. We analyze 127 studies published between 2018-2024 and identify key trends, contradictions, and research gaps.",
    publicationDate: "2024-01-20",
    venue: "Harvard Business Review",
    citationCount: 156,
    referenceCount: 203,
    fieldsOfStudy: ["Business", "Artificial Intelligence", "CRM"],
    source: "openalex",
    methodology: "systematic-review",
    openAccess: true,
  },
  {
    id: "3",
    title: "Neural Networks for Predictive Customer Analytics",
    authors: [{ id: "a5", name: "Lisa Kumar", affiliations: ["Carnegie Mellon"] }],
    abstract:
      "We introduce a novel neural architecture for predicting customer churn with 92% accuracy. Our approach combines recurrent and convolutional layers to capture both temporal and spatial patterns.",
    publicationDate: "2023-11-10",
    venue: "NeurIPS 2023",
    citationCount: 89,
    referenceCount: 56,
    fieldsOfStudy: ["Machine Learning", "Customer Analytics"],
    pdfUrl: "/placeholder.pdf",
    source: "arxiv",
    methodology: "experiment",
    openAccess: true,
  },
]

// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  endpoints: {
    search: "/api/search",
    paper: "/api/papers",
    citations: "/api/citations",
    clusters: "/api/clusters",
    review: "/api/review/generate",
    insights: "/api/insights",
  },
}

// Search papers across multiple sources
export async function searchPapers(query: string, filters?: SearchFilters): Promise<Paper[]> {
  // TODO: Replace with real API call
  // const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.search}`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ query, filters })
  // })
  // return response.json()

  await new Promise((resolve) => setTimeout(resolve, 800)) // Simulate network delay

  let results = [...MOCK_PAPERS]

  if (filters?.openAccessOnly) {
    results = results.filter((p) => p.openAccess)
  }

  if (filters?.yearFrom) {
    results = results.filter((p) => new Date(p.publicationDate).getFullYear() >= filters.yearFrom!)
  }

  if (filters?.minCitations) {
    results = results.filter((p) => p.citationCount >= filters.minCitations!)
  }

  return results
}

// Get paper details by ID
export async function getPaperById(id: string): Promise<Paper | null> {
  // TODO: Replace with real API call
  await new Promise((resolve) => setTimeout(resolve, 300))
  return MOCK_PAPERS.find((p) => p.id === id) || null
}

// Get citation network for a paper
export async function getCitationNetwork(paperId: string) {
  // TODO: Replace with real API call
  await new Promise((resolve) => setTimeout(resolve, 500))
  return {
    citations: MOCK_PAPERS.slice(0, 2),
    references: MOCK_PAPERS.slice(1, 3),
  }
}

// Get topic clusters
export async function getTopicClusters(paperIds: string[]): Promise<TopicCluster[]> {
  // TODO: Replace with real API call
  await new Promise((resolve) => setTimeout(resolve, 600))
  return [
    {
      id: "c1",
      name: "AI in Customer Experience",
      papers: MOCK_PAPERS.slice(0, 2),
      keywords: ["AI", "Customer Experience", "Personalization"],
      centralPaperId: "1",
    },
    {
      id: "c2",
      name: "Predictive Analytics",
      papers: MOCK_PAPERS.slice(1, 3),
      keywords: ["Machine Learning", "Prediction", "Analytics"],
      centralPaperId: "3",
    },
  ]
}

// Generate literature review
export async function generateLiteratureReview(researchQuestion: string, paperIds: string[]) {
  // TODO: Replace with real API call
  await new Promise((resolve) => setTimeout(resolve, 2000))
  return {
    id: "lr1",
    title: "Literature Review: AI in Customer Experience",
    researchQuestion,
    sections: [
      {
        title: "Introduction",
        content:
          "This review synthesizes recent research on artificial intelligence applications in customer experience management...",
        citations: ["1", "2"],
        type: "introduction" as const,
      },
      {
        title: "Key Themes",
        content: "Three major themes emerge from the literature: personalization, prediction, and automation...",
        citations: ["1", "2", "3"],
        type: "theme" as const,
      },
    ],
    papers: MOCK_PAPERS,
    createdAt: new Date().toISOString(),
    status: "complete" as const,
  }
}

// Client-side data storage (will be replaced with Supabase)
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
}
