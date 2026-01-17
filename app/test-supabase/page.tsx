"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TestSupabasePage() {
  const [status, setStatus] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkConfig()
  }, [])

  const checkConfig = () => {
    const config = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET",
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anonKeyPreview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 50) + "..." || "NOT SET",
    }
    setStatus(config)
  }

  const testCollectionsAPI = async () => {
    setLoading(true)
    try {
      console.log("[v0] Testing GET /api/collections...")
      const response = await fetch("/api/collections")
      const data = await response.json()

      if (response.ok) {
        setStatus((prev: any) => ({
          ...prev,
          apiTest: "SUCCESS",
          apiResponse: data,
          message: `Fetched ${data.length} collections`,
        }))
      } else {
        setStatus((prev: any) => ({
          ...prev,
          apiTest: "FAILED",
          apiError: data,
          message: data.error || "Unknown error",
        }))
      }
    } catch (error: any) {
      setStatus((prev: any) => ({
        ...prev,
        apiTest: "ERROR",
        apiError: error.message,
        message: error.message,
      }))
    }
    setLoading(false)
  }

  const testCreateCollection = async () => {
    setLoading(true)
    try {
      console.log("[v0] Testing POST /api/collections...")
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Collection " + Date.now(),
          description: "Created from diagnostic page",
          color: "blue",
        }),
      })
      const data = await response.json()

      if (response.ok) {
        setStatus((prev: any) => ({
          ...prev,
          createTest: "SUCCESS",
          createResponse: data,
          message: "Collection created successfully!",
        }))
      } else {
        setStatus((prev: any) => ({
          ...prev,
          createTest: "FAILED",
          createError: data,
          message: data.error || "Unknown error",
        }))
      }
    } catch (error: any) {
      setStatus((prev: any) => ({
        ...prev,
        createTest: "ERROR",
        createError: error.message,
        message: error.message,
      }))
    }
    setLoading(false)
  }

  const testSavedPapersAPI = async () => {
    setLoading(true)
    try {
      console.log("[v0] Testing GET /api/saved-papers...")
      const response = await fetch("/api/saved-papers")
      const data = await response.json()

      if (response.ok) {
        setStatus((prev: any) => ({
          ...prev,
          savedPapersTest: "SUCCESS",
          savedPapersResponse: data,
          savedPapersMessage: `Fetched ${data.length} saved papers`,
        }))
      } else {
        setStatus((prev: any) => ({
          ...prev,
          savedPapersTest: "FAILED",
          savedPapersError: data,
          savedPapersMessage: data.error || "Unknown error",
        }))
      }
    } catch (error: any) {
      setStatus((prev: any) => ({
        ...prev,
        savedPapersTest: "ERROR",
        savedPapersError: error.message,
        savedPapersMessage: error.message,
      }))
    }
    setLoading(false)
  }

  const testLiteratureReviewsAPI = async () => {
    setLoading(true)
    try {
      console.log("[v0] Testing GET /api/literature-reviews...")
      const response = await fetch("/api/literature-reviews")
      const data = await response.json()

      if (response.ok) {
        setStatus((prev: any) => ({
          ...prev,
          reviewsTest: "SUCCESS",
          reviewsResponse: data,
          reviewsMessage: `Fetched ${data.length} literature reviews`,
        }))
      } else {
        setStatus((prev: any) => ({
          ...prev,
          reviewsTest: "FAILED",
          reviewsError: data,
          reviewsMessage: data.error || "Unknown error",
        }))
      }
    } catch (error: any) {
      setStatus((prev: any) => ({
        ...prev,
        reviewsTest: "ERROR",
        reviewsError: error.message,
        reviewsMessage: error.message,
      }))
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Supabase Diagnostic Page</h1>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <strong>NEXT_PUBLIC_SUPABASE_URL:</strong>{" "}
              <span className={status.hasSupabaseUrl ? "text-green-600" : "text-red-600"}>
                {status.hasSupabaseUrl ? "✓ SET" : "✗ NOT SET"}
              </span>
              <div className="text-xs text-muted-foreground mt-1">{status.supabaseUrl}</div>
            </div>
            <div>
              <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong>{" "}
              <span className={status.hasAnonKey ? "text-green-600" : "text-red-600"}>
                {status.hasAnonKey ? "✓ SET" : "✗ NOT SET"}
              </span>
              <div className="text-xs text-muted-foreground mt-1">{status.anonKeyPreview}</div>
            </div>
            <div>
              <strong>SUPABASE_SERVICE_ROLE_KEY:</strong>{" "}
              <span className="text-amber-600">Only checked server-side</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">API Tests</h2>
          <div className="space-y-4">
            <div>
              <Button onClick={testCollectionsAPI} disabled={loading}>
                Test GET Collections
              </Button>
              {status.apiTest && (
                <div className="mt-2">
                  <span
                    className={
                      status.apiTest === "SUCCESS"
                        ? "text-green-600 font-semibold"
                        : status.apiTest === "FAILED"
                          ? "text-red-600 font-semibold"
                          : "text-amber-600 font-semibold"
                    }
                  >
                    {status.apiTest}
                  </span>
                  <div className="text-sm text-muted-foreground mt-1">{status.message}</div>
                  {status.apiResponse && (
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(status.apiResponse, null, 2)}
                    </pre>
                  )}
                  {status.apiError && (
                    <pre className="mt-2 p-2 bg-red-50 text-red-800 rounded text-xs overflow-auto">
                      {JSON.stringify(status.apiError, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div>
              <Button onClick={testCreateCollection} disabled={loading}>
                Test CREATE Collection
              </Button>
              {status.createTest && (
                <div className="mt-2">
                  <span
                    className={
                      status.createTest === "SUCCESS"
                        ? "text-green-600 font-semibold"
                        : status.createTest === "FAILED"
                          ? "text-red-600 font-semibold"
                          : "text-amber-600 font-semibold"
                    }
                  >
                    {status.createTest}
                  </span>
                  <div className="text-sm text-muted-foreground mt-1">{status.message}</div>
                  {status.createResponse && (
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(status.createResponse, null, 2)}
                    </pre>
                  )}
                  {status.createError && (
                    <pre className="mt-2 p-2 bg-red-50 text-red-800 rounded text-xs overflow-auto">
                      {JSON.stringify(status.createError, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div>
              <Button onClick={testSavedPapersAPI} disabled={loading}>
                Test GET Saved Papers
              </Button>
              {status.savedPapersTest && (
                <div className="mt-2">
                  <span
                    className={
                      status.savedPapersTest === "SUCCESS"
                        ? "text-green-600 font-semibold"
                        : status.savedPapersTest === "FAILED"
                          ? "text-red-600 font-semibold"
                          : "text-amber-600 font-semibold"
                    }
                  >
                    {status.savedPapersTest}
                  </span>
                  <div className="text-sm text-muted-foreground mt-1">{status.savedPapersMessage}</div>
                  {status.savedPapersResponse && (
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(status.savedPapersResponse, null, 2)}
                    </pre>
                  )}
                  {status.savedPapersError && (
                    <pre className="mt-2 p-2 bg-red-50 text-red-800 rounded text-xs overflow-auto">
                      {JSON.stringify(status.savedPapersError, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div>
              <Button onClick={testLiteratureReviewsAPI} disabled={loading}>
                Test GET Literature Reviews
              </Button>
              {status.reviewsTest && (
                <div className="mt-2">
                  <span
                    className={
                      status.reviewsTest === "SUCCESS"
                        ? "text-green-600 font-semibold"
                        : status.reviewsTest === "FAILED"
                          ? "text-red-600 font-semibold"
                          : "text-amber-600 font-semibold"
                    }
                  >
                    {status.reviewsTest}
                  </span>
                  <div className="text-sm text-muted-foreground mt-1">{status.reviewsMessage}</div>
                  {status.reviewsResponse && (
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(status.reviewsResponse, null, 2)}
                    </pre>
                  )}
                  {status.reviewsError && (
                    <pre className="mt-2 p-2 bg-red-50 text-red-800 rounded text-xs overflow-auto">
                      {JSON.stringify(status.reviewsError, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-amber-50 dark:bg-amber-950">
          <h2 className="text-xl font-semibold mb-4">How to Get CORRECT Service Role Key</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Go to your Supabase dashboard at https://supabase.com/dashboard</li>
            <li>
              Click <strong>Settings</strong> → <strong>API</strong>
            </li>
            <li>
              Scroll to <strong>Project API keys</strong>
            </li>
            <li>
              Find the <strong>service_role</strong> key (marked as secret)
            </li>
            <li>Click the eye icon to reveal it</li>
            <li>Copy the ENTIRE key (it should be very long, around 200+ characters)</li>
            <li>
              The service_role key should have <code>"role":"service_role"</code> in the JWT payload, NOT "role":"anon"
            </li>
            <li>
              Add it to Vercel as <code>SUPABASE_SERVICE_ROLE_KEY</code> (NO "NEXT_PUBLIC_" prefix!)
            </li>
            <li>Redeploy your app</li>
          </ol>
        </Card>

        <Card className="p-6 bg-red-50 dark:bg-red-950">
          <h2 className="text-xl font-semibold mb-4">Common Issue: Using Anon Key as Service Role Key</h2>
          <p className="text-sm mb-4">
            If your writes are failing but reads work, you likely set the <strong>anon key</strong> as the service role
            key. These are two DIFFERENT keys:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>
              <strong>anon key</strong> - Public key, respects Row Level Security (RLS)
            </li>
            <li>
              <strong>service_role key</strong> - Secret key, bypasses RLS (needed for server-side writes)
            </li>
          </ul>
          <p className="text-sm mt-4">
            Make sure you copy the correct <code>service_role</code> key from your Supabase dashboard, not the anon key.
          </p>
        </Card>

        <Card className="p-6 bg-blue-50 dark:bg-blue-950">
          <h2 className="text-xl font-semibold mb-4">Quick Fix: Disable RLS Instead</h2>
          <p className="text-sm mb-4">
            If you want to test immediately without service_role key, disable RLS on your tables:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Go to Supabase Table Editor</li>
            <li>Click on the "collections" table</li>
            <li>Click the shield icon or "RLS" button</li>
            <li>Click "Disable RLS"</li>
            <li>Repeat for "saved_papers", "insights", and "literature_reviews" tables</li>
          </ol>
          <p className="text-sm mt-4 text-amber-700 dark:text-amber-400">
            Warning: This makes data publicly accessible. Fine for testing, but add auth for production.
          </p>
        </Card>
      </div>
    </div>
  )
}
