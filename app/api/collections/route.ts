import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// GET /api/collections - Get all collections with paper counts
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: collections, error: collectionsError } = await supabase
      .from("collections_with_counts")
      .select("*")
      .order("created_at", { ascending: false })

    if (collectionsError) {
      console.error("[v0] Collections error:", collectionsError.message)
      return NextResponse.json({ error: collectionsError.message }, { status: 500 })
    }

    const collectionsWithCounts = (collections || []).map((collection: any) => {
      console.log("[v0] Collection", collection.name, "has", collection.paper_count, "papers")

      return {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        color: collection.color,
        created_at: collection.created_at,
        updated_at: collection.updated_at,
        paperIds: [],
        paper_count: collection.paper_count,
      }
    })

    console.log("[v0] Returning collections with counts:", collectionsWithCounts)
    return NextResponse.json(collectionsWithCounts)
  } catch (err) {
    console.error("[v0] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/collections - Create or update collection
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { id, name, description, color } = body

    const supabase = getSupabaseAdmin()
    const anonymousUserId = "00000000-0000-0000-0000-000000000000"

    if (id) {
      const { data, error } = await supabase
        .from("collections")
        .update({
          name,
          description,
          color,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("[API] Update error:", error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      const insertData = {
        user_id: anonymousUserId,
        name: name as string,
        description: description as string | null,
        color: (color as string) || "#3B82F6",
      }

      const { data, error } = await supabase.from("collections").insert(insertData).select().single()

      if (error) {
        console.error("[API] Insert error:", error.message, error.code, error.details)
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            details: error.details,
          },
          { status: 500 },
        )
      }

      return NextResponse.json(data)
    }
  } catch (err) {
    console.error("[API] Unexpected error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/collections?id=xxx
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing collection id" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from("collections").delete().eq("id", id)

    if (error) {
      console.error("[API] Delete error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[API] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
