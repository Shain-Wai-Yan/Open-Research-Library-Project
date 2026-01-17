"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"

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
          createMessage: "Collection created successfully!",
        }))
      } else {
        setStatus((prev: any) => ({
          ...prev,
          createTest: "FAILED",
          createError: data,
          createMessage: data.error || "Unknown error",
        }))
      }
    } catch (error: any) {
      setStatus((prev: any) => ({
        ...prev,
        createTest: "ERROR",
        createError: error.message,
        createMessage: error.message,
      }))
    }
    setLoading(false)
  }

  const testInsightsAPI = async () => {
    setLoading(true)
    try {
      console.log("[v0] Testing GET /api/insights...")
      const response = await fetch("/api/insights")
      const data = await response.json()

      if (response.ok) {
        setStatus((prev: any) => ({
          ...prev,
          insightsTest: "SUCCESS",
          insightsResponse: data,
          insightsMessage: `Fetched ${data.length} insights`,
        }))
      } else {
        setStatus((prev: any) => ({
          ...prev,
          insightsTest: "FAILED",
          insightsError: data,
          insightsMessage: data.error || "Unknown error",
        }))
      }
    } catch (error: any) {
      setStatus((prev: any) => ({
        ...prev,
        insightsTest: "ERROR",
        insightsError: error.message,
        insightsMessage: error.message,
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

  const runAllTests = async () => {
    await testCollectionsAPI()
    await testInsightsAPI()
    await testSavedPapersAPI()
    await testLiteratureReviewsAPI()
  }

  const ResultBadge = ({ test, message }: { test: string; message: string }) => (
    <div className="mt-2">
      <span
        className={
          test === "SUCCESS"
            ? "inline-flex items-center px-2 py-1 rounded text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            : test === "FAILED"
              ? "inline-flex items-center px-2 py-1 rounded text-sm font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              : "inline-flex items-center px-2 py-1 rounded text-sm font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
        }
      >
        {test}
      </span>
      <p className="text-sm text-muted-foreground mt-1">{message}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Supabase Diagnostic Page</h1>
            <p className="text-muted-foreground">Test all 4 API routes and debug connection issues</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Environment Variables */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Environment Variables (Client-side)</h2>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex items-start gap-2">
                <span className={`shrink-0 ${status.hasSupabaseUrl ? "text-green-600" : "text-red-600"}`}>
                  {status.hasSupabaseUrl ? "OK" : "MISSING"}
                </span>
                <div>
                  <strong>NEXT_PUBLIC_SUPABASE_URL</strong>
                  <div className="text-xs text-muted-foreground break-all">{status.supabaseUrl}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className={`shrink-0 ${status.hasAnonKey ? "text-green-600" : "text-red-600"}`}>
                  {status.hasAnonKey ? "OK" : "MISSING"}
                </span>
                <div>
                  <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong>
                  <div className="text-xs text-muted-foreground break-all">{status.anonKeyPreview}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-amber-600">SERVER</span>
                <div>
                  <strong>SUPABASE_SERVICE_ROLE_KEY</strong>
                  <div className="text-xs text-muted-foreground">
                    Checked server-side only (see API response debug info)
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Run All Tests */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">API Route Tests (All 4 Tables)</h2>
              <Button onClick={runAllTests} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Run All Tests
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Collections */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">1. Collections</h3>
                  <Button size="sm" variant="outline" onClick={testCollectionsAPI} disabled={loading}>
                    Test GET
                  </Button>
                </div>
                {status.apiTest && <ResultBadge test={status.apiTest} message={status.message} />}
                {status.apiError && (
                  <pre className="mt-2 p-2 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(status.apiError, null, 2)}
                  </pre>
                )}
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={testCreateCollection} disabled={loading}>
                    Test CREATE
                  </Button>
                  {status.createTest && <ResultBadge test={status.createTest} message={status.createMessage} />}
                  {status.createError && (
                    <pre className="mt-2 p-2 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 rounded text-xs overflow-auto max-h-32">
                      {JSON.stringify(status.createError, null, 2)}
                    </pre>
                  )}
                </div>
              </div>

              {/* Insights */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">2. Insights</h3>
                  <Button size="sm" variant="outline" onClick={testInsightsAPI} disabled={loading}>
                    Test GET
                  </Button>
                </div>
                {status.insightsTest && <ResultBadge test={status.insightsTest} message={status.insightsMessage} />}
                {status.insightsError && (
                  <pre className="mt-2 p-2 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(status.insightsError, null, 2)}
                  </pre>
                )}
              </div>

              {/* Saved Papers */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">3. Saved Papers</h3>
                  <Button size="sm" variant="outline" onClick={testSavedPapersAPI} disabled={loading}>
                    Test GET
                  </Button>
                </div>
                {status.savedPapersTest && (
                  <ResultBadge test={status.savedPapersTest} message={status.savedPapersMessage} />
                )}
                {status.savedPapersError && (
                  <pre className="mt-2 p-2 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(status.savedPapersError, null, 2)}
                  </pre>
                )}
              </div>

              {/* Literature Reviews */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">4. Literature Reviews</h3>
                  <Button size="sm" variant="outline" onClick={testLiteratureReviewsAPI} disabled={loading}>
                    Test GET
                  </Button>
                </div>
                {status.reviewsTest && <ResultBadge test={status.reviewsTest} message={status.reviewsMessage} />}
                {status.reviewsError && (
                  <pre className="mt-2 p-2 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(status.reviewsError, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </Card>

          {/* Troubleshooting Guide */}
          <Card className="p-6 border-amber-500 bg-amber-50 dark:bg-amber-950">
            <h2 className="text-xl font-semibold mb-4">Troubleshooting Guide</h2>

            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                  If you see "Supabase not configured":
                </h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-amber-700 dark:text-amber-300">
                  <li>Check that SUPABASE_SERVICE_ROLE_KEY is set (not NEXT_PUBLIC_ prefix!)</li>
                  <li>The debug info in the error response shows key length - service role keys are ~200+ chars</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">If GET works but CREATE fails:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-amber-700 dark:text-amber-300">
                  <li>You might be using anon key instead of service_role key</li>
                  <li>Check RLS policies on your tables - service_role bypasses RLS</li>
                  <li>Verify table exists with correct column names</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                  If you see "relation does not exist":
                </h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-amber-700 dark:text-amber-300">
                  <li>Table not created yet - run the SQL migration script</li>
                  <li>Table name mismatch (check for typos)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">Required Environment Variables:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-amber-700 dark:text-amber-300">
                  <li>
                    <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> - Your
                    Supabase project URL
                  </li>
                  <li>
                    <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> -
                    Public anon key (~150 chars)
                  </li>
                  <li>
                    <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> -
                    Secret service role key (~200 chars)
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {/* SQL Migration */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Required Tables SQL</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Run this in your Supabase SQL Editor if tables don't exist:
            </p>
            <pre className="p-4 bg-muted rounded text-xs overflow-auto max-h-96">
              {`-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved papers table
CREATE TABLE IF NOT EXISTS saved_papers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  paper_id TEXT NOT NULL,
  title TEXT NOT NULL,
  authors JSONB,
  year INTEGER,
  abstract TEXT,
  citations INTEGER DEFAULT 0,
  doi TEXT,
  pdf_url TEXT,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insights table
CREATE TABLE IF NOT EXISTS insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  paper_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('concept', 'method', 'claim', 'limitation', 'gap')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Literature reviews table
CREATE TABLE IF NOT EXISTS literature_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  research_question TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  paper_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Disable RLS for testing (re-enable for production!)
ALTER TABLE collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE saved_papers DISABLE ROW LEVEL SECURITY;
ALTER TABLE insights DISABLE ROW LEVEL SECURITY;
ALTER TABLE literature_reviews DISABLE ROW LEVEL SECURITY;`}
            </pre>
          </Card>
        </div>
      </div>
    </div>
  )
}
