// Real API Integration for 8 Research Sources
// All APIs are configured and ready to use - no backend needed!

import type { Paper, SearchFilters } from "./types"
import { parseQuery } from "./query-parser"
import { deduplicatePapers } from "./deduplication"
import { getSearchEngine } from "./search-engine"

// ============================================================================
// API CONFIGURATION - Using provided credentials
// ============================================================================

const API_CONFIG = {
  openalex: {
    baseUrl: "https://api.openalex.org",
    email: "shainwaiyanx@gmail.com", // Polite pool for faster responses
  },
  semanticScholar: {
    baseUrl: "https://api.semanticscholar.org/graph/v1",
    // Will use public access - can add API key later for higher limits
  },
  crossref: {
    baseUrl: "https://api.crossref.org",
    email: "shainwaiyanx@gmail.com",
  },
  openCitations: {
    baseUrl: "https://opencitations.net/index/coci/api/v1",
  },
  arxiv: {
    baseUrl: "http://export.arxiv.org/api",
  },
  unpaywall: {
    baseUrl: "https://api.unpaywall.org/v2",
    email: "shainwaiyanx@gmail.com",
  },
  core: {
    baseUrl: "https://api.core.ac.uk/v3",
    apiKey: "1ijPByuoNLfv2SqOlD98K0wtA3Vzn7Mc",
  },
  pubmed: {
    baseUrl: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils",
  },
}

// ============================================================================
// SEARCH RESULT TYPE - For pagination
// ============================================================================

export interface SearchResult {
  papers: Paper[]
  totalResults: number
  currentPage: number
  hasMore: boolean
}

// ============================================================================
// 1. OPENALEX API - Primary search engine (250M+ papers)
// ============================================================================

async function searchOpenAlex(
  query: string,
  filters?: SearchFilters,
  page = 1,
  pageSize = 50,
): Promise<{ papers: Paper[]; total: number }> {
  try {
    let url = `${API_CONFIG.openalex.baseUrl}/works?search=${encodeURIComponent(query)}&mailto=${API_CONFIG.openalex.email}&per-page=${pageSize}&page=${page}`

    // Apply filters
    const filterParts: string[] = []
    if (filters?.yearFrom) {
      filterParts.push(`publication_year:${filters.yearFrom}-${filters.yearTo || new Date().getFullYear()}`)
    }
    if (filters?.openAccessOnly) {
      filterParts.push("is_oa:true")
    }
    if (filterParts.length > 0) {
      url += `&filter=${filterParts.join(",")}`
    }

    const response = await fetch(url)
    if (!response.ok) throw new Error(`OpenAlex error: ${response.statusText}`)

    const data = await response.json()

    const papers = data.results.map((work: any) => ({
      id: work.id,
      title: work.title || "Untitled",
      authors:
        work.authorships?.map((a: any) => ({
          id: a.author.id,
          name: a.author.display_name,
          affiliations: a.institutions?.map((i: any) => i.display_name) || [],
        })) || [],
      abstract: work.abstract || work.abstract_inverted_index ? "Abstract available" : "No abstract available",
      publicationDate: work.publication_date || "",
      venue: work.primary_location?.source?.display_name || "Unknown Venue",
      citationCount: work.cited_by_count || 0,
      referenceCount: work.referenced_works_count || 0,
      fieldsOfStudy: work.topics?.map((t: any) => t.display_name) || [],
      pdfUrl: work.open_access?.oa_url || undefined,
      doi: work.doi?.replace("https://doi.org/", "") || undefined,
      source: "openalex" as const,
      openAccess: work.open_access?.is_oa || false,
    }))

    return { papers, total: data.meta?.count || 0 }
  } catch (error) {
    console.error("[OpenAlex] Search error:", error)
    return { papers: [], total: 0 }
  }
}

// ============================================================================
// 2. SEMANTIC SCHOLAR API - Citation network & recommendations
// ============================================================================

async function searchSemanticScholar(
  query: string,
  filters?: SearchFilters,
  page = 1,
  pageSize = 50,
): Promise<{ papers: Paper[]; total: number }> {
  try {
    const offset = (page - 1) * pageSize
    const url = `${API_CONFIG.semanticScholar.baseUrl}/paper/search?query=${encodeURIComponent(query)}&limit=${pageSize}&offset=${offset}&fields=paperId,title,abstract,authors,year,citationCount,referenceCount,openAccessPdf,externalIds,fieldsOfStudy`

    const response = await fetch(url)
    if (!response.ok) throw new Error(`Semantic Scholar error: ${response.statusText}`)

    const data = await response.json()

    const papers =
      data.data?.map((paper: any) => ({
        id: paper.paperId,
        title: paper.title,
        authors:
          paper.authors?.map((a: any) => ({
            id: a.authorId,
            name: a.name,
          })) || [],
        abstract: paper.abstract || "No abstract available",
        publicationDate: paper.year ? `${paper.year}-01-01` : "",
        venue: paper.venue || "Unknown",
        citationCount: paper.citationCount || 0,
        referenceCount: paper.referenceCount || 0,
        fieldsOfStudy: paper.fieldsOfStudy || [],
        pdfUrl: paper.openAccessPdf?.url || undefined,
        doi: paper.externalIds?.DOI || undefined,
        source: "semantic-scholar" as const,
        openAccess: !!paper.openAccessPdf,
      })) || []

    return { papers, total: data.total || 0 }
  } catch (error) {
    console.error("[Semantic Scholar] Search error:", error)
    return { papers: [], total: 0 }
  }
}

async function getSemanticScholarCitations(paperId: string) {
  try {
    const [citationsRes, referencesRes] = await Promise.all([
      fetch(
        `${API_CONFIG.semanticScholar.baseUrl}/paper/${paperId}/citations?fields=paperId,title,year,authors,citationCount&limit=20`,
      ),
      fetch(
        `${API_CONFIG.semanticScholar.baseUrl}/paper/${paperId}/references?fields=paperId,title,year,authors,citationCount&limit=20`,
      ),
    ])

    const citationsData = await citationsRes.json()
    const referencesData = await referencesRes.json()

    const mapPaper = (item: any) => ({
      id: item.citedPaper?.paperId || item.paperId,
      title: item.citedPaper?.title || item.title || "Untitled",
      authors:
        item.citedPaper?.authors?.map((a: any) => ({ id: a.authorId, name: a.name })) ||
        item.authors?.map((a: any) => ({ id: a.authorId, name: a.name })) ||
        [],
      abstract: "",
      publicationDate: item.citedPaper?.year ? `${item.citedPaper.year}-01-01` : "",
      venue: "",
      citationCount: item.citedPaper?.citationCount || 0,
      referenceCount: 0,
      fieldsOfStudy: [],
      source: "semantic-scholar" as const,
      openAccess: false,
    })

    return {
      citations: citationsData.data?.map(mapPaper) || [],
      references: referencesData.data?.map(mapPaper) || [],
    }
  } catch (error) {
    console.error("[Semantic Scholar] Citations error:", error)
    return { citations: [], references: [] }
  }
}

// ============================================================================
// 3. ARXIV API - Preprints (2M+ papers)
// ============================================================================

async function searchArxiv(query: string, page = 1, pageSize = 50): Promise<{ papers: Paper[]; total: number }> {
  try {
    if (typeof window === "undefined") {
      console.log("[arXiv] Skipping on server-side")
      return { papers: [], total: 0 }
    }

    const start = (page - 1) * pageSize
    const url = `${API_CONFIG.arxiv.baseUrl}/query?search_query=all:${encodeURIComponent(query)}&start=${start}&max_results=${pageSize}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) throw new Error(`arXiv error: ${response.statusText}`)

    const text = await response.text()
    const parser = new DOMParser()
    const xml = parser.parseFromString(text, "text/xml")

    const totalResults = Number.parseInt(xml.querySelector("totalResults")?.textContent || "0")
    const entries = Array.from(xml.querySelectorAll("entry"))

    const papers = entries.map((entry) => {
      const id = entry.querySelector("id")?.textContent?.split("/").pop() || ""
      const authors = Array.from(entry.querySelectorAll("author name")).map((name) => ({
        id: name.textContent || "",
        name: name.textContent || "",
      }))

      return {
        id: `arxiv:${id}`,
        title: entry.querySelector("title")?.textContent?.trim() || "Untitled",
        authors,
        abstract: entry.querySelector("summary")?.textContent?.trim() || "",
        publicationDate: entry.querySelector("published")?.textContent || "",
        venue: "arXiv",
        citationCount: 0,
        referenceCount: 0,
        fieldsOfStudy: Array.from(entry.querySelectorAll("category")).map((cat) => cat.getAttribute("term") || ""),
        pdfUrl: `https://arxiv.org/pdf/${id}.pdf`,
        source: "arxiv" as const,
        openAccess: true,
      }
    })

    return { papers, total: totalResults }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[arXiv] Request timeout")
    } else {
      console.error("[arXiv] Search error:", error)
    }
    return { papers: [], total: 0 }
  }
}

// ============================================================================
// 4. CROSSREF API - Metadata enrichment (130M+ works)
// ============================================================================

async function searchCrossref(query: string, page = 1, pageSize = 50): Promise<{ papers: Paper[]; total: number }> {
  try {
    const offset = (page - 1) * pageSize
    const url = `${API_CONFIG.crossref.baseUrl}/works?query=${encodeURIComponent(query)}&mailto=${API_CONFIG.crossref.email}&rows=${pageSize}&offset=${offset}`

    const response = await fetch(url)
    if (!response.ok) throw new Error(`Crossref error: ${response.statusText}`)

    const data = await response.json()

    const papers =
      data.message?.items?.map((item: any) => ({
        id: item.DOI,
        title: item.title?.[0] || "Untitled",
        authors:
          item.author?.map((a: any) => ({
            id: `${a.given}-${a.family}`,
            name: `${a.given || ""} ${a.family || ""}`.trim(),
          })) || [],
        abstract: item.abstract || "No abstract available",
        publicationDate: item.created?.["date-time"] || "",
        venue: item["container-title"]?.[0] || "Unknown",
        citationCount: item["is-referenced-by-count"] || 0,
        referenceCount: item["references-count"] || 0,
        fieldsOfStudy: item.subject || [],
        doi: item.DOI,
        source: "crossref" as const,
        openAccess: item.link?.some((l: any) => l.URL) || false,
      })) || []

    return { papers, total: data.message?.["total-results"] || 0 }
  } catch (error) {
    console.error("[Crossref] Search error:", error)
    return { papers: [], total: 0 }
  }
}

// ============================================================================
// 5. OPENCITATIONS API - Citation network (1.4B+ citations)
// ============================================================================

async function getOpenCitations(doi: string) {
  try {
    const [citationsRes, referencesRes] = await Promise.all([
      fetch(`${API_CONFIG.openCitations.baseUrl}/citations/${doi}`),
      fetch(`${API_CONFIG.openCitations.baseUrl}/references/${doi}`),
    ])

    const citations = citationsRes.ok ? await citationsRes.json() : []
    const references = referencesRes.ok ? await referencesRes.json() : []

    return {
      citationCount: citations.length,
      referenceCount: references.length,
      citationDois: citations.map((c: any) => c.citing),
      referenceDois: references.map((r: any) => r.cited),
    }
  } catch (error) {
    console.error("[OpenCitations] Error:", error)
    return { citationCount: 0, referenceCount: 0, citationDois: [], referenceDois: [] }
  }
}

// ============================================================================
// 6. UNPAYWALL API - Open access PDFs (30M+ papers)
// ============================================================================

async function getUnpaywallPDF(doi: string): Promise<string | null> {
  try {
    const url = `${API_CONFIG.unpaywall.baseUrl}/${doi}?email=${API_CONFIG.unpaywall.email}`
    const response = await fetch(url)

    if (!response.ok) return null

    const data = await response.json()
    return data.best_oa_location?.url_for_pdf || null
  } catch (error) {
    console.error("[Unpaywall] Error:", error)
    return null
  }
}

// ============================================================================
// 7. CORE API - Open access papers (200M+ papers)
// ============================================================================

async function searchCore(query: string, page = 1, pageSize = 50): Promise<{ papers: Paper[]; total: number }> {
  try {
    const offset = (page - 1) * pageSize
    const url = `${API_CONFIG.core.baseUrl}/search/works?q=${encodeURIComponent(query)}&limit=${pageSize}&offset=${offset}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_CONFIG.core.apiKey}`,
      },
    })

    if (!response.ok) throw new Error(`CORE error: ${response.statusText}`)

    const data = await response.json()

    const papers =
      data.results?.map((item: any) => ({
        id: `core:${item.id}`,
        title: item.title || "Untitled",
        authors:
          item.authors?.map((a: any) => ({
            id: a,
            name: a,
          })) || [],
        abstract: item.abstract || "No abstract available",
        publicationDate: item.publishedDate || "",
        venue: item.publisher || "Unknown",
        citationCount: 0,
        referenceCount: 0,
        fieldsOfStudy: item.topics || [],
        pdfUrl: item.downloadUrl || undefined,
        doi: item.doi || undefined,
        source: "core" as const,
        openAccess: true,
      })) || []

    return { papers, total: data.totalHits || 0 }
  } catch (error) {
    console.error("[CORE] Search error:", error)
    return { papers: [], total: 0 }
  }
}

// ============================================================================
// 8. PUBMED API - Medical/life sciences (35M+ papers)
// ============================================================================

async function searchPubMed(query: string): Promise<Paper[]> {
  try {
    // First, search for IDs
    const searchUrl = `${API_CONFIG.pubmed.baseUrl}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=10`
    const searchRes = await fetch(searchUrl)
    const searchData = await searchRes.json()

    const ids = searchData.esearchresult?.idlist || []
    if (ids.length === 0) return []

    // Then fetch details
    const fetchUrl = `${API_CONFIG.pubmed.baseUrl}/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`
    const fetchRes = await fetch(fetchUrl)
    const fetchData = await fetchRes.json()

    return ids.map((id: string) => {
      const paper = fetchData.result?.[id]
      return {
        id: `pubmed:${id}`,
        title: paper?.title || "Untitled",
        authors:
          paper?.authors?.map((a: any) => ({
            id: a.name,
            name: a.name,
          })) || [],
        abstract: "Abstract available on PubMed",
        publicationDate: paper?.pubdate || "",
        venue: paper?.source || "PubMed",
        citationCount: 0,
        referenceCount: 0,
        fieldsOfStudy: [],
        doi: paper?.elocationid?.replace("doi: ", "") || undefined,
        source: "pubmed" as const,
        openAccess: false,
      }
    })
  } catch (error) {
    console.error("[PubMed] Search error:", error)
    return []
  }
}

// ============================================================================
// UNIFIED SEARCH - Combines all sources with pagination
// ============================================================================

const activeRequests = new Map<string, AbortController>()

export async function searchAllSources(
  query: string,
  filters?: SearchFilters,
  page = 1,
  pageSize = 50,
): Promise<SearchResult> {
  const requestKey = `${query}::${page}::${JSON.stringify(filters)}`

  if (activeRequests.has(requestKey)) {
    activeRequests.get(requestKey)?.abort()
    activeRequests.delete(requestKey)
  }

  const controller = new AbortController()
  activeRequests.set(requestKey, controller)

  try {
    console.log("[API] Search request:", { query, page, filters })

    const parsedQuery = parseQuery(query)

    const timeout = 15000 // 15 seconds
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // Search all sources in parallel with abort signal
    const results = await Promise.all([
      searchOpenAlex(query, filters, page, pageSize).catch((err) => {
        console.error("[OpenAlex] Failed:", err)
        return { papers: [], total: 0 }
      }),
      searchSemanticScholar(query, filters, page, pageSize).catch((err) => {
        console.error("[Semantic Scholar] Failed:", err)
        return { papers: [], total: 0 }
      }),
      searchArxiv(query, page, pageSize).catch((err) => {
        console.error("[arXiv] Failed:", err)
        return { papers: [], total: 0 }
      }),
      searchCrossref(query, page, pageSize).catch((err) => {
        console.error("[Crossref] Failed:", err)
        return { papers: [], total: 0 }
      }),
      searchCore(query, page, pageSize).catch((err) => {
        console.error("[CORE] Failed:", err)
        return { papers: [], total: 0 }
      }),
    ])

    clearTimeout(timeoutId)
    activeRequests.delete(requestKey)

    const totalResults = results.reduce((sum, r) => sum + r.total, 0)
    const allPapers = results.flatMap((r) => r.papers)

    console.log("[API] Raw results:", allPapers.length, "papers from", results.length, "sources")

    // Deduplicate
    let uniquePapers = deduplicatePapers(allPapers)
    console.log("[API] After deduplication:", uniquePapers.length, "papers")

    // Apply basic filters BEFORE indexing
    if (filters?.openAccessOnly) {
      uniquePapers = uniquePapers.filter((p) => p.openAccess)
    }

    if (filters?.minCitations) {
      uniquePapers = uniquePapers.filter((p) => p.citationCount >= filters.minCitations!)
    }

    if (filters?.author) {
      const authorLower = filters.author.toLowerCase()
      uniquePapers = uniquePapers.filter((p) => p.authors.some((a) => a.name.toLowerCase().includes(authorLower)))
    }

    if (filters?.venue) {
      const venueLower = filters.venue.toLowerCase()
      uniquePapers = uniquePapers.filter((p) => p.venue.toLowerCase().includes(venueLower))
    }

    if (filters?.methodology && filters.methodology.length > 0) {
      uniquePapers = uniquePapers.filter((p) => p.methodology && filters.methodology!.includes(p.methodology))
    }

    console.log("[API] After filters:", uniquePapers.length, "papers")

    // Index papers in search engine
    const searchEngine = getSearchEngine()
    searchEngine.indexPapers(uniquePapers)

    // Use search engine for ranking and sorting
    const sortBy = filters?.sortBy || "relevance"
    const searchResult = searchEngine.search(query, sortBy)

    console.log("[API] Search engine stats:", searchResult.stats)
    console.log("[API] Final results:", searchResult.papers.length, "papers")

    return {
      papers: searchResult.papers,
      totalResults,
      currentPage: page,
      hasMore: page * pageSize < totalResults,
    }
  } catch (error) {
    activeRequests.delete(requestKey)

    if (error instanceof Error && error.name === "AbortError") {
      console.log("[API] Request cancelled or timed out")
    } else {
      console.error("[API] Search failed:", error)
    }

    return {
      papers: [],
      totalResults: 0,
      currentPage: page,
      hasMore: false,
    }
  }
}

// ============================================================================
// ENHANCED CITATION NETWORK - Combines Semantic Scholar + OpenCitations
// ============================================================================

export async function getEnhancedCitationNetwork(paperId: string, doi?: string) {
  console.log("[v0] Fetching citation network...")

  const [semanticData, openCitationsData] = await Promise.all([
    getSemanticScholarCitations(paperId),
    doi ? getOpenCitations(doi) : Promise.resolve(null),
  ])

  return {
    citations: semanticData.citations,
    references: semanticData.references,
    citationCount: openCitationsData?.citationCount || semanticData.citations.length,
    referenceCount: openCitationsData?.referenceCount || semanticData.references.length,
  }
}

// ============================================================================
// PDF ACCESS - Tries Unpaywall for open access PDFs
// ============================================================================

export async function enhancePaperWithPDF(paper: Paper): Promise<Paper> {
  if (paper.pdfUrl || !paper.doi) return paper

  const pdfUrl = await getUnpaywallPDF(paper.doi)

  return {
    ...paper,
    pdfUrl: pdfUrl || paper.pdfUrl,
    openAccess: !!pdfUrl || paper.openAccess,
  }
}
