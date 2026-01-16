// Core type definitions for Open Research Library

export interface Paper {
  id: string
  title: string
  authors: Author[]
  abstract: string
  publicationDate: string
  venue: string
  citationCount: number
  referenceCount: number
  fieldsOfStudy: string[]
  pdfUrl?: string
  doi?: string
  source: "openalex" | "semantic-scholar" | "arxiv"
  methodology?: MethodologyType
  openAccess: boolean
}

export interface Author {
  id: string
  name: string
  affiliations?: string[]
  hIndex?: number
}

export interface Citation {
  paperId: string
  citingPaperId: string
  context?: string
}

export interface Collection {
  id: string
  name: string
  description?: string
  paperIds: string[]
  createdAt: string
  updatedAt: string
  color: string
}

export interface Note {
  id: string
  paperId: string
  content: string
  createdAt: string
  updatedAt: string
  tags: string[]
}

export interface AtomicInsight {
  id: string
  paperId: string
  type: "concept" | "method" | "claim" | "limitation" | "gap"
  content: string
  relatedInsights: string[]
  createdAt: string
  tags: string[]
}

export interface SearchFilters {
  yearFrom?: number
  yearTo?: number
  fieldsOfStudy?: string[]
  methodology?: MethodologyType[]
  minCitations?: number
  openAccessOnly?: boolean
  sources?: Paper["source"][]
}

export type MethodologyType =
  | "survey"
  | "experiment"
  | "case-study"
  | "systematic-review"
  | "meta-analysis"
  | "qualitative"
  | "mixed-methods"

export interface TopicCluster {
  id: string
  name: string
  papers: Paper[]
  keywords: string[]
  centralPaperId: string
}

export interface LiteratureReview {
  id: string
  title: string
  researchQuestion: string
  sections: ReviewSection[]
  papers: Paper[]
  createdAt: string
  status: "draft" | "complete"
}

export interface ReviewSection {
  title: string
  content: string
  citations: string[]
  type: "introduction" | "theme" | "methodology" | "findings" | "gaps" | "conclusion"
}

export interface UserProfile {
  id: string
  name: string
  email: string
  institution?: string
  researchInterests: string[]
  createdAt: string
}

export interface SearchResult {
  papers: Paper[]
  totalResults: number
  currentPage: number
  hasMore: boolean
}
