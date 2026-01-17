// Advanced Paper Deduplication
// Uses DOI, arXiv ID, and fuzzy title matching

import type { Paper } from "./types"

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy title matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
      }
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * Calculate similarity ratio (0-1) between two strings
 */
function similarityRatio(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2)
  const maxLength = Math.max(str1.length, str2.length)
  return 1 - distance / maxLength
}

/**
 * Normalize title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
}

/**
 * Extract arXiv ID from paper ID or DOI
 */
function extractArxivId(paper: Paper): string | null {
  // Check paper ID
  if (paper.id.includes("arxiv")) {
    const match = paper.id.match(/(\d{4}\.\d{4,5})/)
    return match ? match[1] : null
  }

  // Check DOI
  if (paper.doi && paper.doi.includes("arxiv")) {
    const match = paper.doi.match(/(\d{4}\.\d{4,5})/)
    return match ? match[1] : null
  }

  return null
}

/**
 * Generate deduplication key for a paper
 * Priority: DOI > arXiv ID > normalized title
 */
export function generateDeduplicationKey(paper: Paper): string {
  // Priority 1: DOI (most reliable)
  if (paper.doi) {
    return `doi:${paper.doi.toLowerCase()}`
  }

  // Priority 2: arXiv ID
  const arxivId = extractArxivId(paper)
  if (arxivId) {
    return `arxiv:${arxivId}`
  }

  // Priority 3: Normalized title
  return `title:${normalizeTitle(paper.title)}`
}

/**
 * Check if two papers are duplicates using fuzzy matching
 */
export function areDuplicates(paper1: Paper, paper2: Paper): boolean {
  // Check DOI match
  if (paper1.doi && paper2.doi) {
    return paper1.doi.toLowerCase() === paper2.doi.toLowerCase()
  }

  // Check arXiv ID match
  const arxiv1 = extractArxivId(paper1)
  const arxiv2 = extractArxivId(paper2)
  if (arxiv1 && arxiv2) {
    return arxiv1 === arxiv2
  }

  // Check fuzzy title match
  const title1 = normalizeTitle(paper1.title)
  const title2 = normalizeTitle(paper2.title)

  // Consider duplicates if similarity > 90%
  const similarity = similarityRatio(title1, title2)
  return similarity > 0.9
}

/**
 * Merge duplicate papers, keeping the best data from each
 */
export function mergePapers(papers: Paper[]): Paper {
  if (papers.length === 0) {
    throw new Error("Cannot merge empty array of papers")
  }

  if (papers.length === 1) {
    return papers[0]
  }

  // Start with the first paper as base
  const merged = { ...papers[0] }

  for (let i = 1; i < papers.length; i++) {
    const paper = papers[i]

    // Keep the highest citation count
    merged.citationCount = Math.max(merged.citationCount, paper.citationCount)
    merged.referenceCount = Math.max(merged.referenceCount, paper.referenceCount)

    // Keep PDF URL if available
    if (!merged.pdfUrl && paper.pdfUrl) {
      merged.pdfUrl = paper.pdfUrl
    }

    // Keep DOI if available
    if (!merged.doi && paper.doi) {
      merged.doi = paper.doi
    }

    // Keep the longest abstract
    if (paper.abstract.length > merged.abstract.length) {
      merged.abstract = paper.abstract
    }

    // Merge authors (avoid duplicates)
    const existingAuthorNames = new Set(merged.authors.map((a) => a.name.toLowerCase()))
    for (const author of paper.authors) {
      if (!existingAuthorNames.has(author.name.toLowerCase())) {
        merged.authors.push(author)
        existingAuthorNames.add(author.name.toLowerCase())
      }
    }

    // Merge fields of study
    const existingFields = new Set(merged.fieldsOfStudy.map((f) => f.toLowerCase()))
    for (const field of paper.fieldsOfStudy) {
      if (!existingFields.has(field.toLowerCase())) {
        merged.fieldsOfStudy.push(field)
        existingFields.add(field.toLowerCase())
      }
    }

    // Mark as open access if any source says so
    merged.openAccess = merged.openAccess || paper.openAccess
  }

  return merged
}

/**
 * Deduplicate an array of papers
 */
export function deduplicatePapers(papers: Paper[]): Paper[] {
  const groups = new Map<string, Paper[]>()

  // Group papers by deduplication key
  for (const paper of papers) {
    const key = generateDeduplicationKey(paper)

    if (!groups.has(key)) {
      groups.set(key, [])
    }

    groups.get(key)!.push(paper)
  }

  // Merge each group
  const deduplicated: Paper[] = []

  for (const group of groups.values()) {
    deduplicated.push(mergePapers(group))
  }

  // Additional pass: check for fuzzy duplicates that weren't caught by keys
  const final: Paper[] = []

  for (const paper of deduplicated) {
    const duplicate = final.find((p) => areDuplicates(p, paper))

    if (duplicate) {
      // Replace with merged version
      const index = final.indexOf(duplicate)
      final[index] = mergePapers([duplicate, paper])
    } else {
      final.push(paper)
    }
  }

  return final
}
