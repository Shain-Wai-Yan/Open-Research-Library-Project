"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Network } from "lucide-react"

export default function NetworksPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Header />

        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Citation Networks</h1>
              <p className="text-muted-foreground">Visualize relationships between papers</p>
            </div>

            <Card className="p-16 text-center">
              <Network className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Network Visualization</h3>
              <p className="text-muted-foreground">Select papers from your library to visualize citation networks</p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
