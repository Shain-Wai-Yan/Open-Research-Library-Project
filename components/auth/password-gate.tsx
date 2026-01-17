"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock, AlertCircle } from "lucide-react"

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showError, setShowError] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated
    const authenticated = sessionStorage.getItem("research_library_authenticated")
    if (authenticated === "true") {
      setIsAuthenticated(true)
    }
    setIsChecking(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const correctPassword = process.env.NEXT_PUBLIC_ACCESS_PASSWORD || "research2024"

    if (password === correctPassword) {
      sessionStorage.setItem("research_library_authenticated", "true")
      setIsAuthenticated(true)
      setShowError(false)
    } else {
      setShowError(true)
      setPassword("")
    }
  }

  if (isChecking) {
    return null
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-emerald-200/50">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
              <Lock className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Welcome to Shain Studio's</h1>
          <h2 className="text-xl font-semibold text-center bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-6">
            Open Research Library
          </h2>

          <p className="text-center text-gray-600 mb-8">Please enter your access password to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setShowError(false)
                }}
                className="w-full text-center text-lg py-6"
                autoFocus
              />
            </div>

            {showError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">
                  You don't have access to Open Research Library. Please check your password.
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              Access Library
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            This library is password-protected to prevent unauthorized access
          </p>
        </div>
      </div>
    </div>
  )
}
