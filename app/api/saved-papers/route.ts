import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase-server"

// GET /api/saved-papers - Get all saved papers, optionally filtered by collection
export async function GET(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const collectionId = searchParams.get("collectionId")

    const supabase = getSupabaseAdmin()
    let query = supabase.from("saved_papers").select("*").order("created_at", { ascending: false })

    if (collectionId) {
      query = query.eq("collection_id", collectionId)
    }

    const { data, error } = await query

    if (error) {
      console.error("[API] Supabase error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("[API] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/saved-papers - Save a paper to a collection
export async function POST(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { collectionId, paperId, title, authors, year, abstract, citations, doi, pdfUrl, source, notes } = body

    const supabase = getSupabaseAdmin()
    const anonymousUserId = "00000000-0000-0000-0000-000000000000"

    // Check if paper already exists in collection
    const { data: existing } = await supabase
      .from("saved_papers")
      .select("id")
      .eq("collection_id", collectionId)
      .eq("paper_id", paperId)
      .single()

    if (existing) {
      // Update existing saved paper
      const { data, error } = await supabase
        .from("saved_papers")
        .update({
          title,
          authors: authors || null,
          year: year || null,
          abstract: abstract || null,
          citations: citations || 0,
          doi: doi || null,
          pdf_url: pdfUrl || null,
          source: source || null,
          notes: notes || null,
        } as any)
        .eq("id", existing.id)
        .select()
        .single()

      if (error) {
        console.error("[API] Update error:", error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // Create new saved paper
      const { data, error } = await supabase
        .from("saved_papers")
        .insert({
          user_id: anonymousUserId,
          collection_id: collectionId,
          paper_id: paperId,
          title,
          authors: authors || null,
          year: year || null,
          abstract: abstract || null,
          citations: citations || 0,
          doi: doi || null,
          pdf_url: pdfUrl || null,
          source: source || null,
          notes: notes || null,
        } as any)
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

// DELETE /api/saved-papers?id=xxx or ?paperId=xxx&collectionId=xxx
export async function DELETE(request: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const paperId = searchParams.get("paperId")
    const collectionId = searchParams.get("collectionId")

    const supabase = getSupabaseAdmin()

    if (id) {
      const { error } = await supabase.from("saved_papers").delete().eq("id", id)
      if (error) {
        console.error("[API] Delete error:", error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else if (paperId && collectionId) {
      const { error } = await supabase
        .from("saved_papers")
        .delete()
        .eq("paper_id", paperId)
        .eq("collection_id", collectionId)
      if (error) {
        console.error("[API] Delete error:", error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: "Missing id or paperId+collectionId" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[API] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
