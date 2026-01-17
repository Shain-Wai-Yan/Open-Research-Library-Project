import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase-server"

// GET /api/literature-reviews - Get all literature reviews
export async function GET(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    const supabase = getSupabaseAdmin()

    if (id) {
      // Get single review
      const { data, error } = await supabase.from("literature_reviews").select("*").eq("id", id).single()

      if (error) {
        console.error("[API] Supabase error:", error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // Get all reviews
      const { data, error } = await supabase
        .from("literature_reviews")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[API] Supabase error:", error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (err) {
    console.error("[API] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/literature-reviews - Create or update literature review
export async function POST(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { id, title, researchQuestion, content, paperIds } = body

    const supabase = getSupabaseAdmin()
    const anonymousUserId = "00000000-0000-0000-0000-000000000000"

    if (id) {
      // Update existing review
      const { data, error } = await supabase
        .from("literature_reviews")
        .update({
          title,
          research_question: researchQuestion,
          content: content || {},
          paper_ids: paperIds || [],
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
      // Create new review
      const { data, error } = await supabase
        .from("literature_reviews")
        .insert({
          user_id: anonymousUserId,
          title,
          research_question: researchQuestion,
          content: content || {},
          paper_ids: paperIds || [],
        })
        .select()
        .single()

      if (error) {
        console.error("[API] Insert error:", error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (err) {
    console.error("[API] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/literature-reviews?id=xxx
export async function DELETE(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing review id" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from("literature_reviews").delete().eq("id", id)

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
