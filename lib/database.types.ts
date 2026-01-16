export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      collections: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      saved_papers: {
        Row: {
          id: string
          user_id: string
          collection_id: string
          paper_id: string
          title: string
          authors: Json | null
          year: number | null
          abstract: string | null
          citations: number
          doi: string | null
          pdf_url: string | null
          source: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          collection_id: string
          paper_id: string
          title: string
          authors?: Json | null
          year?: number | null
          abstract?: string | null
          citations?: number
          doi?: string | null
          pdf_url?: string | null
          source?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          collection_id?: string
          paper_id?: string
          title?: string
          authors?: Json | null
          year?: number | null
          abstract?: string | null
          citations?: number
          doi?: string | null
          pdf_url?: string | null
          source?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      insights: {
        Row: {
          id: string
          user_id: string
          paper_id: string
          type: "concept" | "method" | "claim" | "limitation" | "gap"
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          paper_id: string
          type: "concept" | "method" | "claim" | "limitation" | "gap"
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          paper_id?: string
          type?: "concept" | "method" | "claim" | "limitation" | "gap"
          content?: string
          created_at?: string
        }
      }
      literature_reviews: {
        Row: {
          id: string
          user_id: string
          title: string
          research_question: string
          content: Json
          paper_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          research_question: string
          content: Json
          paper_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          research_question?: string
          content?: Json
          paper_ids?: string[]
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
