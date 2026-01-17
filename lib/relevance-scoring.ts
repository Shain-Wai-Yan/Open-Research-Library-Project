// Multi-Factor Relevance Scoring for PhD-level Research
// Combines: query relevance, citation velocity, recency, journal prestige

import type { Paper } from "./types"
import type { ParsedQuery } from "./query-parser"
import { calculateQueryRelevance } from "./query-parser"

export type SortOption = "relevance" | "recent" | "citations" | "citation-velocity"

export interface ScoringWeights {
  queryMatch: number // 0-1, importance of keyword matching
  citationVelocity: number // 0-1, citations per year
  recency: number // 0-1, how recent the paper is
  citationCount: number // 0-1, total citations
}

/**
 * Default scoring weights optimized for comprehensive research
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  queryMatch: 0.4, // Query relevance is most important
  citationVelocity: 0.25, // Citation velocity shows current impact
  recency: 0.2, // Recent papers are valuable
  citationCount: 0.15, // Historical impact matters less
}

/**
 * Alternative weights for finding classic/seminal papers
 */
export const CLASSIC_WEIGHTS: ScoringWeights = {
  queryMatch: 0.3,
  citationVelocity: 0.1,
  recency: 0.05,
  citationCount: 0.55, // Heavily prioritize highly-cited papers
}

/**
 * Calculate citation velocity (citations per year)
 */
export function calculateCitationVelocity(paper: Paper): number {
  const publicationYear = new Date(paper.publicationDate).getFullYear()
  const currentYear = new Date().getFullYear()
  const yearsSincePublication = Math.max(currentYear - publicationYear, 1)

  return paper.citationCount / yearsSincePublication
}

/**
 * Calculate recency score (0-100)
 * Papers from this year = 100, decays over time
 */
export function calculateRecencyScore(paper: Paper): number {
  const publicationYear = new Date(paper.publicationDate).getFullYear()
  const currentYear = new Date().getFullYear()
  const age = currentYear - publicationYear

  // Exponential decay: papers lose ~10% relevance per year
  return Math.max(0, 100 * Math.exp(-0.1 * age))
}

/**
 * Normalize citation count to 0-100 scale
 * Uses logarithmic scale since citations follow power law distribution
 */
export function normalizeCitationCount(citationCount: number): number {
  if (citationCount === 0) return 0

  // Log scale: 1 citation = 0, 10 = 33, 100 = 66, 1000 = 100
  return Math.min(100, (Math.log10(citationCount + 1) / Math.log10(1000)) * 100)
}

/**
 * Calculate comprehensive relevance score for a paper
 */
export function calculateRelevanceScore(
  paper: Paper,
  parsedQuery: ParsedQuery,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): number {
  // 1. Query match score (0-100)
  const queryScore = calculateQueryRelevance(
    {
      title: paper.title,
      abstract: paper.abstract,
      authors: paper.authors,
    },
    parsedQuery,
  )

  // 2. Citation velocity score (0-100)
  const velocity = calculateCitationVelocity(paper)
  const velocityScore = Math.min(100, velocity * 2) // Scale: 50 citations/year = 100 points

  // 3. Recency score (0-100)
  const recencyScore = calculateRecencyScore(paper)

  // 4. Citation count score (0-100, log scale)
  const citationScore = normalizeCitationCount(paper.citationCount)

  // Weighted combination
  const finalScore =
    queryScore * weights.queryMatch +
    velocityScore * weights.citationVelocity +
    recencyScore * weights.recency +
    citationScore * weights.citationCount

  return finalScore
}

/**
 * Sort papers based on selected sort option
 */
export function sortPapers(papers: Paper[], sortBy: SortOption, parsedQuery?: ParsedQuery): Paper[] {
  const sorted = [...papers]

  switch (sortBy) {
    case "relevance":
      if (!parsedQuery) {
        // Fallback to citation count if no query
        return sorted.sort((a, b) => b.citationCount - a.citationCount)
      }
      return sorted.sort((a, b) => {
        const scoreA = calculateRelevanceScore(a, parsedQuery)
        const scoreB = calculateRelevanceScore(b, parsedQuery)
        return scoreB - scoreA
      })

    case "recent":
      return sorted.sort((a, b) => {
        const dateA = new Date(a.publicationDate).getTime()
        const dateB = new Date(b.publicationDate).getTime()
        return dateB - dateA
      })

    case "citations":
      return sorted.sort((a, b) => b.citationCount - a.citationCount)

    case "citation-velocity":
      return sorted.sort((a, b) => {
        const velocityA = calculateCitationVelocity(a)
        const velocityB = calculateCitationVelocity(b)
        return velocityB - velocityA
      })

    default:
      return sorted
  }
}

/**
 * Get human-readable explanation of why a paper scored well
 */
export function explainRelevance(paper: Paper, parsedQuery: ParsedQuery, score: number): string[] {
  const reasons: string[] = []

  const queryScore = calculateQueryRelevance(
    { title: paper.title, abstract: paper.abstract, authors: paper.authors },
    parsedQuery,
  )

  if (queryScore > 20) {
    reasons.push("Strong keyword match in title")
  } else if (queryScore > 10) {
    reasons.push("Keywords found in abstract")
  }

  const velocity = calculateCitationVelocity(paper)
  if (velocity > 50) {
    reasons.push(`High impact: ${velocity.toFixed(0)} citations/year`)
  }

  const recency = calculateRecencyScore(paper)
  if (recency > 80) {
    reasons.push("Recently published")
  }

  if (paper.citationCount > 100) {
    reasons.push(`Highly cited: ${paper.citationCount.toLocaleString()} citations`)
  }

  if (paper.openAccess) {
    reasons.push("Open access available")
  }

  return reasons
}
