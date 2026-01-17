"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { CollectionManager } from "@/components/collections/collection-manager"
import { SavedPapersList } from "@/components/papers/saved-papers-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LibraryPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Header />

        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Research Library</h1>
              <p className="text-muted-foreground">Organize and manage your academic papers</p>
            </div>

            <Tabs defaultValue="collections" className="space-y-6">
              <TabsList>
                <TabsTrigger value="collections">Collections</TabsTrigger>
                <TabsTrigger value="saved">All Saved Papers</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="collections" className="space-y-6">
                <CollectionManager />
              </TabsContent>

              <TabsContent value="saved">
                <SavedPapersList />
              </TabsContent>

              <TabsContent value="notes">
                <div className="text-center py-16 text-muted-foreground">Your notes will appear here</div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
