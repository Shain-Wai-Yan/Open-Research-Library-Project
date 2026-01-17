"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { CollectionManager } from "@/components/collections/collection-manager"
import { CollectionView } from "@/components/collections/collection-view"
import { AllSavedPapers } from "@/components/collections/all-saved-papers"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

export default function LibraryPage() {
  const [selectedCollection, setSelectedCollection] = useState<{ id: string; name: string } | null>(null)

  const handleCollectionClick = (collectionId: string, collectionName: string) => {
    setSelectedCollection({ id: collectionId, name: collectionName })
  }

  const handleBackToCollections = () => {
    setSelectedCollection(null)
  }

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
                {selectedCollection ? (
                  <div>
                    <Button variant="ghost" onClick={handleBackToCollections} className="mb-4">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Collections
                    </Button>
                    <CollectionView collectionId={selectedCollection.id} collectionName={selectedCollection.name} />
                  </div>
                ) : (
                  <CollectionManager onCollectionClick={handleCollectionClick} />
                )}
              </TabsContent>

              <TabsContent value="saved">
                <AllSavedPapers />
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
