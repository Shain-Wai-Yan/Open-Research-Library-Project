// Production-Ready Search Engine with Inverted Indexes
// Implements: candidate generation, precomputed scores, query caching, short-circuit paths
// Fixed: windowing, AST evaluation, candidate pruning, token-based scoring, token-set evaluation, NOT logic

import type { Paper } from "./types"
import { parseQuery, type ParsedQuery, extractTermsFromAST, tokenize, type ASTNode } from "./query-parser"

// ============================================================================
// TYPES
// ============================================================================

export interface IndexedPaper extends Paper {
  // Precomputed scores (computed once at ingest)
  _precomputed: {
    citationVelocity: number // citations per year
    recencyScore: number // 0-100
    normalizedCitations: number // log scale 0-100
    yearsSincePublication: number
  }
  _tokenSets: {
    title: Set<string>
    abstract: Set<string>
    authors: Set<string>
  }
}

type PaperID = string
type Token = string

// ============================================================================
// INVERTED INDEXES
// ============================================================================

const MIN_TOKEN_LENGTH = 2

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "was",
  "are",
  "were",
  "been",
  "be",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "should",
  "could",
  "may",
  "might",
  "can",
])

class PrefixIndex {
  private index = new Map<string, Set<PaperID>>()

  add(token: string, paperId: PaperID): void {
    const prefix = token.substring(0, Math.min(3, token.length))
    if (!this.index.has(prefix)) {
      this.index.set(prefix, new Set())
    }
    this.index.get(prefix)!.add(paperId)
  }

  search(pattern: string): Set<PaperID> {
    const prefix = pattern.substring(0, Math.min(3, pattern.length))
    return this.index.get(prefix) || new Set()
  }
}

class InvertedIndex {
  private titleIndex = new Map<Token, Set<PaperID>>()
  private abstractIndex = new Map<Token, Set<PaperID>>()
  private authorIndex = new Map<Token, Set<PaperID>>()
  private prefixIndex = new PrefixIndex()
  private doiIndex = new Map<string, PaperID>()
  private arxivIndex = new Map<string, PaperID>()
  private papers = new Map<PaperID, IndexedPaper>()

  addPaper(paper: Paper): void {
    const indexed = this.precomputeScores(paper)
    this.papers.set(paper.id, indexed)

    const titleTokens = tokenize(paper.title)
    for (const token of titleTokens) {
      if (!this.titleIndex.has(token)) {
        this.titleIndex.set(token, new Set())
      }
      this.titleIndex.get(token)!.add(paper.id)
      this.prefixIndex.add(token, paper.id)
    }

    const abstractTokens = tokenize(paper.abstract)
    for (const token of abstractTokens) {
      if (!this.abstractIndex.has(token)) {
        this.abstractIndex.set(token, new Set())
      }
      this.abstractIndex.get(token)!.add(paper.id)
    }

    const authorText = paper.authors.map((a) => a.name).join(" ")
    const authorTokens = tokenize(authorText)
    for (const token of authorTokens) {
      if (!this.authorIndex.has(token)) {
        this.authorIndex.set(token, new Set())
      }
      this.authorIndex.get(token)!.add(paper.id)
    }

    if (paper.doi) {
      this.doiIndex.set(paper.doi.toLowerCase(), paper.id)
    }

    if (paper.id.startsWith("arxiv:")) {
      const arxivId = paper.id.replace("arxiv:", "")
      this.arxivIndex.set(arxivId.toLowerCase(), paper.id)
    }
  }

  private precomputeScores(paper: Paper): IndexedPaper {
    const publicationYear = new Date(paper.publicationDate).getFullYear()
    const currentYear = new Date().getFullYear()
    const yearsSincePublication = Math.max(currentYear - publicationYear, 1)

    const citationVelocity = paper.citationCount / yearsSincePublication
    const age = currentYear - publicationYear
    const recencyScore = Math.max(0, 100 * Math.exp(-0.1 * age))
    const normalizedCitations =
      paper.citationCount === 0 ? 0 : Math.min(100, (Math.log10(paper.citationCount + 1) / Math.log10(1000)) * 100)

    const titleTokens = new Set(tokenize(paper.title))
    const abstractTokens = new Set(tokenize(paper.abstract))
    const authorText = paper.authors.map((a) => a.name).join(" ")
    const authorTokens = new Set(tokenize(authorText))

    return {
      ...paper,
      _precomputed: {
        citationVelocity,
        recencyScore,
        normalizedCitations,
        yearsSincePublication,
      },
      _tokenSets: {
        title: titleTokens,
        abstract: abstractTokens,
        authors: authorTokens,
      },
    }
  }

  getPaperByDOI(doi: string): IndexedPaper | null {
    const paperId = this.doiIndex.get(doi.toLowerCase())
    return paperId ? this.papers.get(paperId) || null : null
  }

  getPaperByArxivId(arxivId: string): IndexedPaper | null {
    const paperId = this.arxivIndex.get(arxivId.toLowerCase())
    return paperId ? this.papers.get(paperId) || null : null
  }

  getCandidates(parsedQuery: ParsedQuery): Set<PaperID> {
    if (!parsedQuery.ast) return new Set()
    return this.getCandidatesFromAST(parsedQuery.ast)
  }

  private getCandidatesFromAST(node: ASTNode): Set<PaperID> {
    if (node.type === "TERM") {
      const term = node.value || ""

      if (node.isWildcard) {
        const pattern = term.replace(/\*/g, "")
        return this.prefixIndex.search(pattern)
      }

      const tokens = tokenize(term)
      const candidates = new Set<PaperID>()

      for (const token of tokens) {
        const titleHits = this.titleIndex.get(token) || new Set()
        const abstractHits = this.abstractIndex.get(token) || new Set()
        const authorHits = this.authorIndex.get(token) || new Set()

        for (const id of titleHits) candidates.add(id)
        for (const id of abstractHits) candidates.add(id)
        for (const id of authorHits) candidates.add(id)
      }

      return candidates
    }

    if (node.type === "AND") {
      const left = this.getCandidatesFromAST(node.left!)
      const right = this.getCandidatesFromAST(node.right!)
      return new Set([...left].filter((id) => right.has(id)))
    }

    if (node.type === "OR") {
      const left = this.getCandidatesFromAST(node.left!)
      const right = this.getCandidatesFromAST(node.right!)
      return new Set([...left, ...right])
    }

    if (node.type === "NOT") {
      const allPapers = new Set(this.papers.keys())
      const childCandidates = this.getCandidatesFromAST(node.child!)
      return new Set([...allPapers].filter((id) => !childCandidates.has(id)))
    }

    return new Set()
  }

  getPaper(id: PaperID): IndexedPaper | null {
    return this.papers.get(id) || null
  }

  getAllPapers(): IndexedPaper[] {
    return Array.from(this.papers.values())
  }

  getStats() {
    return {
      totalPapers: this.papers.size,
      titleTokens: this.titleIndex.size,
      abstractTokens: this.abstractIndex.size,
      authorTokens: this.authorIndex.size,
    }
  }
}

// ============================================================================
// QUERY CACHE
// ============================================================================

interface CachedResult {
  paperIds: PaperID[]
  timestamp: number
  accessTime: number
}

class QueryCache {
  private cache = new Map<string, CachedResult>()
  private ttl = 5 * 60 * 1000
  private maxSize = 100

  private normalize(query: string, sortBy = "relevance"): string {
    return `${query.toLowerCase().trim().replace(/\s+/g, " ")}::${sortBy}`
  }

  get(query: string, sortBy = "relevance"): PaperID[] | null {
    const key = this.normalize(query, sortBy)
    const cached = this.cache.get(key)

    if (!cached) return null

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    cached.accessTime = Date.now()
    return cached.paperIds
  }

  set(query: string, paperIds: PaperID[], sortBy = "relevance"): void {
    const key = this.normalize(query, sortBy)

    if (this.cache.size >= this.maxSize) {
      let lruKey: string | null = null
      let lruTime = Number.POSITIVE_INFINITY

      for (const [k, v] of this.cache.entries()) {
        if (v.accessTime < lruTime) {
          lruTime = v.accessTime
          lruKey = k
        }
      }

      if (lruKey) {
        this.cache.delete(lruKey)
      }
    }

    const now = Date.now()
    this.cache.set(key, {
      paperIds,
      timestamp: now,
      accessTime: now,
    })
  }

  clear(): void {
    this.cache.clear()
  }
}

// ============================================================================
// SEARCH ENGINE
// ============================================================================

const MAX_INDEXED_PAPERS = 10000

export class SearchEngine {
  private index = new InvertedIndex()
  private queryCache = new QueryCache()

  indexPapers(papers: Paper[]): void {
    console.log("[SearchEngine] Indexing", papers.length, "papers...")
    const start = performance.now()

    const existingIds = new Set(this.index.getAllPapers().map((p) => p.id))
    const newPapers = papers.filter((p) => !existingIds.has(p.id))

    if (newPapers.length === 0) {
      console.log("[SearchEngine] No new papers to index")
      return
    }

    const totalAfterIndex = this.index.getAllPapers().length + newPapers.length
    if (totalAfterIndex > MAX_INDEXED_PAPERS) {
      console.warn(`[SearchEngine] Would exceed max size (${MAX_INDEXED_PAPERS}), resetting index`)
      resetSearchEngine()
      return this.indexPapers(papers)
    }

    for (const paper of newPapers) {
      this.index.addPaper(paper)
    }

    const elapsed = performance.now() - start
    console.log("[SearchEngine] Indexed in", elapsed.toFixed(0), "ms")
    console.log("[SearchEngine] Stats:", this.index.getStats())
  }

  search(
    query: string,
    sortBy: "relevance" | "recent" | "citations" | "citation-velocity" = "relevance",
  ): {
    papers: Paper[]
    stats: {
      totalCandidates: number
      filteredCandidates: number
      scoredPapers: number
      executionTime: number
      cacheHit: boolean
    }
  } {
    const start = performance.now()

    const cachedIds = this.queryCache.get(query, sortBy)
    if (cachedIds) {
      const papers = cachedIds.map((id) => this.index.getPaper(id)).filter((p) => p !== null) as IndexedPaper[]
      return {
        papers: this.sortPapers(papers, sortBy, query),
        stats: {
          totalCandidates: papers.length,
          filteredCandidates: papers.length,
          scoredPapers: papers.length,
          executionTime: performance.now() - start,
          cacheHit: true,
        },
      }
    }

    const parsedQuery = parseQuery(query)

    if (parsedQuery.filters.some((f) => f.field === "doi")) {
      const doiFilter = parsedQuery.filters.find((f) => f.field === "doi")!
      const paper = this.index.getPaperByDOI(doiFilter.value)
      if (paper) {
        return {
          papers: [paper],
          stats: {
            totalCandidates: 1,
            filteredCandidates: 1,
            scoredPapers: 1,
            executionTime: performance.now() - start,
            cacheHit: false,
          },
        }
      }
    }

    const candidates = this.index.getCandidates(parsedQuery)
    const totalCandidates = candidates.size

    if (candidates.size === 0) {
      return {
        papers: [],
        stats: {
          totalCandidates: 0,
          filteredCandidates: 0,
          scoredPapers: 0,
          executionTime: performance.now() - start,
          cacheHit: false,
        },
      }
    }

    const matchedPapers: IndexedPaper[] = []
    for (const id of candidates) {
      const paper = this.index.getPaper(id)
      if (paper && this.evaluateASTWithTokens(parsedQuery.ast, paper)) {
        matchedPapers.push(paper)
      }
    }

    const filteredCandidates = matchedPapers.length

    matchedPapers.sort((a, b) => b._precomputed.citationVelocity - a._precomputed.citationVelocity)

    const windowSize = 500
    const windowedPapers = matchedPapers.slice(0, windowSize)

    const scoredPapers = this.scorePapers(windowedPapers, parsedQuery)
    const sortedPapers = this.sortPapers(scoredPapers, sortBy, query)

    this.queryCache.set(
      query,
      sortedPapers.map((p) => p.id),
      sortBy,
    )

    const executionTime = performance.now() - start
    console.log(
      `[SearchEngine] Query: "${query}" | Candidates: ${totalCandidates} | Matched: ${filteredCandidates} | Scored: ${windowedPapers.length} | Time: ${executionTime.toFixed(0)}ms`,
    )

    return {
      papers: sortedPapers,
      stats: {
        totalCandidates,
        filteredCandidates,
        scoredPapers: windowedPapers.length,
        executionTime,
        cacheHit: false,
      },
    }
  }

  private evaluateASTWithTokens(node: ASTNode | null, paper: IndexedPaper): boolean {
    if (!node) return false

    switch (node.type) {
      case "TERM": {
        const value = node.value?.toLowerCase() || ""

        if (node.isWildcard) {
          const pattern = value.replace(/\*/g, "\\w*")
          const regex = new RegExp(`\\b${pattern}\\b`, "i")
          const allTokens = [...paper._tokenSets.title, ...paper._tokenSets.abstract, ...paper._tokenSets.authors]
          return allTokens.some((token) => regex.test(token))
        }

        const termTokens = tokenize(value)
        for (const token of termTokens) {
          if (
            paper._tokenSets.title.has(token) ||
            paper._tokenSets.abstract.has(token) ||
            paper._tokenSets.authors.has(token)
          ) {
            return true
          }
        }
        return false
      }

      case "AND":
        return (
          this.evaluateASTWithTokens(node.left || null, paper) && this.evaluateASTWithTokens(node.right || null, paper)
        )

      case "OR":
        return (
          this.evaluateASTWithTokens(node.left || null, paper) || this.evaluateASTWithTokens(node.right || null, paper)
        )

      case "NOT":
        return !this.evaluateASTWithTokens(node.child || null, paper)

      default:
        return false
    }
  }

  private scorePapers(papers: IndexedPaper[], parsedQuery: ParsedQuery): IndexedPaper[] {
    const queryTerms = extractTermsFromAST(parsedQuery.ast)

    const scoredPapers = papers.map((paper) => {
      const queryScore = this.calculateFieldAwareScore(paper, queryTerms, parsedQuery.phrases)

      const finalScore =
        queryScore * 0.4 +
        Math.min(100, paper._precomputed.citationVelocity * 2) * 0.25 +
        paper._precomputed.recencyScore * 0.2 +
        paper._precomputed.normalizedCitations * 0.15

      return { ...paper, _score: finalScore }
    })

    return scoredPapers
  }

  private calculateFieldAwareScore(paper: IndexedPaper, queryTerms: string[], phrases: string[]): number {
    let score = 0

    for (const term of queryTerms) {
      const termTokens = tokenize(term)
      for (const token of termTokens) {
        if (paper._tokenSets.title.has(token)) {
          score += 15
        }
      }
    }

    for (const term of queryTerms) {
      const termTokens = tokenize(term)
      for (const token of termTokens) {
        if (paper._tokenSets.abstract.has(token)) {
          score += 5
        }
      }
    }

    for (const term of queryTerms) {
      const termTokens = tokenize(term)
      for (const token of termTokens) {
        if (paper._tokenSets.authors.has(token)) {
          score += 10
        }
      }
    }

    const titleLower = paper.title.toLowerCase()
    const abstractLower = paper.abstract.toLowerCase()
    for (const phrase of phrases) {
      const phraseLower = phrase.toLowerCase()
      if (titleLower.includes(phraseLower)) {
        score += 20
      } else if (abstractLower.includes(phraseLower)) {
        score += 10
      }
    }

    return Math.min(100, score)
  }

  private sortPapers(
    papers: IndexedPaper[],
    sortBy: "relevance" | "recent" | "citations" | "citation-velocity",
    query: string,
  ): Paper[] {
    const sorted = [...papers]

    switch (sortBy) {
      case "relevance":
        return sorted.sort((a, b) => (b._score || 0) - (a._score || 0))

      case "recent":
        return sorted.sort((a, b) => {
          const dateA = new Date(a.publicationDate).getTime()
          const dateB = new Date(b.publicationDate).getTime()
          return dateB - dateA
        })

      case "citations":
        return sorted.sort((a, b) => b.citationCount - a.citationCount)

      case "citation-velocity":
        return sorted.sort((a, b) => b._precomputed.citationVelocity - a._precomputed.citationVelocity)

      default:
        return sorted
    }
  }

  clearCache(): void {
    this.queryCache.clear()
  }
}

let searchEngineInstance: SearchEngine | null = null

export function getSearchEngine(): SearchEngine {
  if (!searchEngineInstance) {
    searchEngineInstance = new SearchEngine()
  }
  return searchEngineInstance
}

export function resetSearchEngine(): void {
  if (searchEngineInstance) {
    searchEngineInstance.clearCache()
    searchEngineInstance = null
  }
}
