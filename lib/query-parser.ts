// Advanced Query Parser for PhD-level Boolean Search
// Supports: Boolean operators (AND, OR, NOT), field-specific search, phrase matching, wildcards

export interface ParsedQuery {
  original: string
  terms: QueryTerm[]
  filters: QueryFilter[]
  phrases: string[]
  isAdvanced: boolean
}

export interface QueryTerm {
  value: string
  field?: "title" | "author" | "abstract" | "doi" | "venue"
  operator: "AND" | "OR" | "NOT"
  isWildcard: boolean
}

export interface QueryFilter {
  field: string
  value: string
  operator: "equals" | "contains" | "range"
}

/**
 * Parse advanced search query with Boolean operators and field-specific search
 *
 * Examples:
 * - "machine learning" AND privacy NOT survey
 * - title:"deep learning" author:Hinton
 * - neuro* AND (fMRI OR "brain imaging")
 */
export function parseQuery(query: string): ParsedQuery {
  const original = query.trim()

  if (!original) {
    return {
      original: "",
      terms: [],
      filters: [],
      phrases: [],
      isAdvanced: false,
    }
  }

  const terms: QueryTerm[] = []
  const filters: QueryFilter[] = []
  const phrases: string[] = []

  // Check if query uses advanced features
  const isAdvanced = /\b(AND|OR|NOT)\b|\w+:|"[^"]+"|[*]/.test(query)

  // Extract quoted phrases first
  const phraseRegex = /"([^"]+)"/g
  let match: RegExpExecArray | null

  while ((match = phraseRegex.exec(query)) !== null) {
    phrases.push(match[1])
  }

  // Remove quoted phrases temporarily for easier parsing
  let processedQuery = query.replace(/"[^"]+"/g, "__PHRASE__")

  // Parse field-specific queries (title:, author:, abstract:, etc.)
  const fieldRegex = /(title|author|abstract|doi|venue):(\S+)/gi

  while ((match = fieldRegex.exec(processedQuery)) !== null) {
    const field = match[1].toLowerCase() as QueryTerm["field"]
    const value = match[2]

    filters.push({
      field,
      value,
      operator: "contains",
    })
  }

  // Remove field queries
  processedQuery = processedQuery.replace(/\w+:\S+/g, "")

  // Split by Boolean operators while preserving them
  const tokens = processedQuery.split(/\s+/).filter((t) => t.length > 0)

  let currentOperator: "AND" | "OR" | "NOT" = "AND"
  let phraseIndex = 0

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    // Check for Boolean operators
    if (token === "AND" || token === "OR" || token === "NOT") {
      currentOperator = token
      continue
    }

    // Replace phrase placeholders
    if (token === "__PHRASE__") {
      if (phraseIndex < phrases.length) {
        terms.push({
          value: phrases[phraseIndex],
          operator: currentOperator,
          isWildcard: false,
        })
        phraseIndex++
      }
      currentOperator = "AND" // Reset to AND after processing
      continue
    }

    // Skip empty tokens
    if (!token || token.length === 0) continue

    // Check for wildcards
    const isWildcard = token.includes("*")
    const cleanedTerm = token.replace(/[()]/g, "") // Remove parentheses

    if (cleanedTerm) {
      terms.push({
        value: cleanedTerm,
        operator: currentOperator,
        isWildcard,
      })
    }

    // Reset operator to AND after each term (default behavior)
    currentOperator = "AND"
  }

  // If no advanced syntax detected, treat as simple phrase search
  if (!isAdvanced) {
    return {
      original,
      terms: [
        {
          value: original,
          operator: "AND",
          isWildcard: false,
        },
      ],
      filters: [],
      phrases: [original],
      isAdvanced: false,
    }
  }

  return {
    original,
    terms,
    filters,
    phrases,
    isAdvanced,
  }
}

/**
 * Check if a text matches a parsed query
 * Used for client-side filtering and relevance scoring
 */
export function matchesQuery(text: string, parsedQuery: ParsedQuery): boolean {
  const lowerText = text.toLowerCase()

  // For simple queries, just check if text contains the query
  if (!parsedQuery.isAdvanced) {
    return lowerText.includes(parsedQuery.original.toLowerCase())
  }

  // For advanced queries, evaluate Boolean logic
  let result = true
  let hasAnyMatch = false

  for (const term of parsedQuery.terms) {
    const termValue = term.value.toLowerCase()
    let matches = false

    if (term.isWildcard) {
      // Convert wildcard to regex
      const pattern = termValue.replace(/\*/g, ".*")
      const regex = new RegExp(pattern, "i")
      matches = regex.test(lowerText)
    } else {
      matches = lowerText.includes(termValue)
    }

    // Apply Boolean logic
    if (term.operator === "NOT") {
      if (matches) return false // Exclude if matched with NOT
    } else if (term.operator === "OR") {
      if (matches) hasAnyMatch = true
    } else {
      // AND
      if (!matches) result = false
    }
  }

  // If we have OR terms, at least one must match
  const hasOrTerms = parsedQuery.terms.some((t) => t.operator === "OR")
  if (hasOrTerms && !hasAnyMatch) return false

  return result
}

/**
 * Calculate relevance score based on query match quality
 * Higher score = better match
 */
export function calculateQueryRelevance(
  paper: { title: string; abstract: string; authors: Array<{ name: string }> },
  parsedQuery: ParsedQuery,
): number {
  let score = 0
  const queryTerms = parsedQuery.terms.map((t) => t.value.toLowerCase())

  // Title matches are most important (weight: 10)
  const titleLower = paper.title.toLowerCase()
  for (const term of queryTerms) {
    if (titleLower.includes(term)) {
      score += 10
      // Bonus for exact match or early position
      if (titleLower.startsWith(term)) score += 5
    }
  }

  // Phrase matches in title (weight: 15)
  for (const phrase of parsedQuery.phrases) {
    if (titleLower.includes(phrase.toLowerCase())) {
      score += 15
    }
  }

  // Abstract matches (weight: 5)
  const abstractLower = paper.abstract.toLowerCase()
  for (const term of queryTerms) {
    if (abstractLower.includes(term)) {
      score += 5
    }
  }

  // Author matches (weight: 8)
  const authorText = paper.authors.map((a) => a.name.toLowerCase()).join(" ")
  for (const term of queryTerms) {
    if (authorText.includes(term)) {
      score += 8
    }
  }

  return score
}
