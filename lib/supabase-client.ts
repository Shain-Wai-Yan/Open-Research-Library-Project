import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./database.types"

let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Get Supabase client (singleton pattern)
 * Safe to call on client-side only
 */
export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn("[Supabase] Environment variables not set - using localStorage fallback")
    return null
  }

  supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseKey)
  return supabaseClient
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
