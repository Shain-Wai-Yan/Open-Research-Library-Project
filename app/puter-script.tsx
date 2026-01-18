"use client"

import Script from "next/script"

export function PuterScript() {
  return (
    <Script
      src="https://js.puter.com/v2/"
      strategy="beforeInteractive"
      onLoad={() => {
        console.log("[v0] Puter.js loaded successfully")
      }}
      onError={(e) => {
        console.error("[v0] Failed to load Puter.js:", e)
      }}
    />
  )
}
