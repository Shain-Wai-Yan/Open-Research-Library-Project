"use client"

import type React from "react"
import { PasswordGate } from "./password-gate"

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <PasswordGate>{children}</PasswordGate>
}
