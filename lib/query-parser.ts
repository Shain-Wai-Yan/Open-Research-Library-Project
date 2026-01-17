export interface ParsedQuery {
  original: string
  ast: ASTNode | null
  filters: QueryFilter[]
  phrases: string[]
  isAdvanced: boolean
}

export type ASTNode = {
  type: "AND" | "OR" | "NOT" | "TERM"
  value?: string
  field?: "title" | "author" | "abstract" | "doi" | "venue"
  isWildcard?: boolean
  left?: ASTNode
  right?: ASTNode
  child?: ASTNode
}

export interface QueryFilter {
  field: string
  value: string
  operator: "equals" | "contains" | "range"
}

const MAX_QUERY_TOKENS = 50
const MAX_WILDCARD_LENGTH = 30

export const STOPWORDS = new Set([
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

export const MIN_TOKEN_LENGTH = 2

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s*]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(t))
}

export function parseQuery(query: string): ParsedQuery {
  const original = query.trim()

  if (!original) {
    return {
      original: "",
      ast: null,
      filters: [],
      phrases: [],
      isAdvanced: false,
    }
  }

  const phrases: string[] = []
  const filters: QueryFilter[] = []

  const isAdvanced = /\b(AND|OR|NOT)\b|\w+:|"[^"]+"|[*]/.test(query)

  // Extract quoted phrases
  const phraseRegex = /"([^"]+)"/g
  let match: RegExpExecArray | null
  let phraseIndex = 0
  const phraseMap = new Map<string, string>()

  while ((match = phraseRegex.exec(query)) !== null) {
    const placeholder = `__PHRASE_${phraseIndex}__`
    phrases.push(match[1])
    phraseMap.set(placeholder, match[1])
    phraseIndex++
  }

  let processedQuery = query.replace(/"([^"]+)"/g, (_, p1, offset) => {
    const idx = phrases.indexOf(p1)
    return `__PHRASE_${idx}__`
  })

  // Parse field-specific queries
  const fieldRegex = /(title|author|abstract|doi|venue):(\S+)/gi

  while ((match = fieldRegex.exec(processedQuery)) !== null) {
    const field = match[1].toLowerCase()
    const value = match[2]

    filters.push({
      field,
      value,
      operator: "contains",
    })
  }

  processedQuery = processedQuery.replace(/\w+:\S+/g, "")

  const ast = buildASTWithPrecedence(processedQuery, phraseMap)

  return {
    original,
    ast,
    filters,
    phrases,
    isAdvanced,
  }
}

type Token =
  | { type: "TERM"; value: string; isWildcard: boolean }
  | { type: "OPERATOR"; value: "AND" | "OR" }
  | { type: "NOT" }
  | { type: "LPAREN" }
  | { type: "RPAREN" }

function tokenizeForParsing(query: string, phraseMap: Map<string, string>): Token[] {
  const tokens: Token[] = []
  const parts = query.match(/AND|OR|NOT|__PHRASE_\d+__|[^\s()]+/gi) || []

  for (let part of parts) {
    const upper = part.toUpperCase()

    if (upper === "AND" || upper === "OR") {
      tokens.push({ type: "OPERATOR", value: upper as "AND" | "OR" })
    } else if (upper === "NOT") {
      tokens.push({ type: "NOT" })
    } else if (part === "(") {
      tokens.push({ type: "LPAREN" })
    } else if (part === ")") {
      tokens.push({ type: "RPAREN" })
    } else if (part.startsWith("__PHRASE_")) {
      const phrase = phraseMap.get(part) || part
      tokens.push({ type: "TERM", value: phrase, isWildcard: false })
    } else {
      if (part.includes("*") && part.length > MAX_WILDCARD_LENGTH) {
        console.warn(`[QueryParser] Wildcard too long: ${part}`)
        part = part.substring(0, MAX_WILDCARD_LENGTH)
      }
      tokens.push({ type: "TERM", value: part, isWildcard: part.includes("*") })
    }
  }

  return tokens
}

function buildASTWithPrecedence(query: string, phraseMap: Map<string, string>): ASTNode | null {
  const tokens = tokenizeForParsing(query, phraseMap)

  if (tokens.length === 0) return null
  if (tokens.length > MAX_QUERY_TOKENS) {
    console.warn(`[QueryParser] Query has ${tokens.length} tokens, truncating`)
    tokens.splice(MAX_QUERY_TOKENS)
  }

  const outputQueue: ASTNode[] = []
  const operatorStack: Token[] = []

  // Operator precedence: NOT(3) > AND(2) > OR(1)
  const precedence = { NOT: 3, AND: 2, OR: 1 }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token.type === "TERM") {
      outputQueue.push({
        type: "TERM",
        value: token.value,
        isWildcard: token.isWildcard,
      })
    } else if (token.type === "NOT") {
      operatorStack.push(token)
    } else if (token.type === "OPERATOR") {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].type !== "LPAREN" &&
        ((operatorStack[operatorStack.length - 1].type === "NOT" && precedence.NOT >= precedence[token.value]) ||
          (operatorStack[operatorStack.length - 1].type === "OPERATOR" &&
            precedence[(operatorStack[operatorStack.length - 1] as any).value as "AND" | "OR"] >=
              precedence[token.value]))
      ) {
        popOperator(operatorStack, outputQueue)
      }
      operatorStack.push(token)
    } else if (token.type === "LPAREN") {
      operatorStack.push(token)
    } else if (token.type === "RPAREN") {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type !== "LPAREN") {
        popOperator(operatorStack, outputQueue)
      }
      if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === "LPAREN") {
        operatorStack.pop() // Remove LPAREN
      }
    }
  }

  while (operatorStack.length > 0) {
    popOperator(operatorStack, outputQueue)
  }

  // If simple query with no operators, OR all terms
  if (outputQueue.length > 1 && !tokens.some((t) => t.type === "OPERATOR" || t.type === "NOT")) {
    return outputQueue.reduce((acc, node) => ({
      type: "OR",
      left: acc,
      right: node,
    }))
  }

  return outputQueue[0] || null
}

function popOperator(operatorStack: Token[], outputQueue: ASTNode[]): void {
  const op = operatorStack.pop()!

  if (op.type === "NOT") {
    const child = outputQueue.pop()
    if (child) {
      outputQueue.push({
        type: "NOT",
        child,
      })
    }
  } else if (op.type === "OPERATOR") {
    const right = outputQueue.pop()
    const left = outputQueue.pop()
    if (left && right) {
      outputQueue.push({
        type: op.value,
        left,
        right,
      })
    }
  }
}

export function evaluateAST(node: ASTNode | null, text: string): boolean {
  if (!node) return false

  const lowerText = text.toLowerCase()

  switch (node.type) {
    case "TERM": {
      const value = node.value?.toLowerCase() || ""
      if (node.isWildcard) {
        const pattern = value.replace(/\*/g, "\\w*")
        const regex = new RegExp(`\\b${pattern}\\b`, "i")
        return regex.test(lowerText)
      }
      return lowerText.includes(value)
    }

    case "AND":
      return evaluateAST(node.left || null, text) && evaluateAST(node.right || null, text)

    case "OR":
      return evaluateAST(node.left || null, text) || evaluateAST(node.right || null, text)

    case "NOT":
      return !evaluateAST(node.child || null, text)

    default:
      return false
  }
}

export function extractTermsFromAST(node: ASTNode | null): string[] {
  if (!node) return []

  const terms: string[] = []

  if (node.type === "TERM" && node.value) {
    terms.push(node.value)
  }

  if (node.left) {
    terms.push(...extractTermsFromAST(node.left))
  }

  if (node.right) {
    terms.push(...extractTermsFromAST(node.right))
  }

  if (node.child) {
    terms.push(...extractTermsFromAST(node.child))
  }

  return terms
}

export function calculateQueryRelevance(
  paper: { title: string; abstract: string; authors: Array<{ name: string }> },
  parsedQuery: ParsedQuery,
): number {
  let score = 0
  const queryTerms = extractTermsFromAST(parsedQuery.ast)

  const titleLower = paper.title.toLowerCase()
  for (const term of queryTerms) {
    const termLower = term.toLowerCase()
    if (titleLower.includes(termLower)) {
      score += 10
      if (titleLower.startsWith(termLower)) score += 5
    }
  }

  for (const phrase of parsedQuery.phrases) {
    if (titleLower.includes(phrase.toLowerCase())) {
      score += 15
    }
  }

  const abstractLower = paper.abstract.toLowerCase()
  for (const term of queryTerms) {
    if (abstractLower.includes(term.toLowerCase())) score += 5
  }

  const authorText = paper.authors.map((a) => a.name.toLowerCase()).join(" ")
  for (const term of queryTerms) {
    if (authorText.includes(term.toLowerCase())) score += 8
  }

  return score
}
