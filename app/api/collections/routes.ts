import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase-server"

// GET /api/collections - Get all collections
export async function GET() {
  console.log("[v0] GET /api/collections - checking config...")
  console.log("[v0] SUPABASE_URL exists:", !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log("[v0] SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  console.log("[v0] SERVICE_ROLE_KEY length:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0)

  if (!isSupabaseAdminConfigured()) {
    console.log("[v0] Supabase admin not configured")
    return NextResponse.json(
      {
        error: "Supabase not configured",
        debug: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        },
      },
      { status: 500 },
    )
  }

  try {
    const supabase = getSupabaseAdmin()
    console.log("[v0] Supabase client created, querying collections...")

    const { data, error } = await supabase.from("collections").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Supabase query error:", error.message, error.code, error.details)
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Successfully fetched", data?.length, "collections")
    return NextResponse.json(data)
  } catch (err: any) {
    console.error("[v0] Unexpected error:", err.message, err.stack)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: err.message,
      },
      { status: 500 },
    )
  }
}

// POST /api/collections - Create or update collection
export async function POST(request: NextRequest) {
  console.log("[v0] POST /api/collections - checking config...")

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error: "Supabase not configured",
        debug: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        },
      },
      { status: 500 },
    )
  }

  try {
    const body = await request.json()
    console.log("[v0] Request body:", JSON.stringify(body))
    const { id, name, description, color } = body

    const supabase = getSupabaseAdmin()
    const anonymousUserId = "00000000-0000-0000-0000-000000000000"

    if (id) {
      console.log("[v0] Updating collection:", id)
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
        console.error("[v0] Update error:", error.message, error.code, error.details)
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          },
          { status: 500 },
        )
      }

      console.log("[v0] Successfully updated collection:", data?.id)
      return NextResponse.json(data)
    } else {
      console.log("[v0] Creating new collection for user:", anonymousUserId)
      const { data, error } = await supabase
        .from("collections")
        .insert({
          user_id: anonymousUserId,
          name,
          description,
          color,
        })
        .select()
        .single()

      if (error) {
        console.error("[v0] Insert error:", error.message, error.code, error.details, error.hint)
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          },
          { status: 500 },
        )
      }

      console.log("[v0] Successfully created collection:", data?.id)
      return NextResponse.json(data)
    }
  } catch (err: any) {
    console.error("[v0] Unexpected error:", err.message, err.stack)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: err.message,
      },
      { status: 500 },
    )
  }
}

// DELETE /api/collections?id=xxx
export async function DELETE(request: NextRequest) {
  console.log("[v0] DELETE /api/collections")

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing collection id" }, { status: 400 })
    }

    console.log("[v0] Deleting collection:", id)
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from("collections").delete().eq("id", id)

    if (error) {
      console.error("[v0] Delete error:", error.message, error.code)
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Successfully deleted collection:", id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[v0] Unexpected error:", err.message)
    return NextResponse.json({ error: "Internal server error", message: err.message }, { status: 500 })
  }
}
