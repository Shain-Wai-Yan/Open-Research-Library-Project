"use client"

import { useState, useEffect } from "react"
import { Plus, FolderOpen, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getCollections, saveCollection, deleteCollection } from "@/lib/api-client"
import type { Collection } from "@/lib/types"

const COLLECTION_COLORS = ["blue", "emerald", "rose", "purple", "amber"] as const

export function CollectionManager() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [newCollection, setNewCollection] = useState({ name: "", description: "" })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    setIsLoading(true)
    const data = await getCollections()
    console.log("[v0] Loaded collections:", data)
    setCollections(data)
    setIsLoading(false)
  }

  const handleCreate = async () => {
    if (!newCollection.name.trim()) return

    const collection = {
      name: newCollection.name,
      description: newCollection.description,
      color: COLLECTION_COLORS[Math.floor(Math.random() * COLLECTION_COLORS.length)],
      paperIds: [],
    }

    console.log("[v0] Creating collection:", collection)
    try {
      await saveCollection(collection)
      await loadCollections()
      setNewCollection({ name: "", description: "" })
      setIsOpen(false)
    } catch (error) {
      console.error("[v0] Error creating collection:", error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCollection(id)
      await loadCollections()
    } catch (error) {
      console.error("[v0] Error deleting collection:", error)
    }
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading collections...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Collections</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Collection</DialogTitle>
              <DialogDescription>Organize your papers into collections</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newCollection.name}
                  onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                  placeholder="e.g., Customer Experience AI"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={newCollection.description}
                  onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                  placeholder="What is this collection about?"
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!newCollection.name.trim()}>
                Create Collection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {collections.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No collections yet. Create one to get started!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <Card key={collection.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-${collection.color}-500 flex items-center justify-center`}>
                    <FolderOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{collection.name}</h4>
                    <p className="text-xs text-muted-foreground">{collection.paperIds?.length || 0} papers</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(collection.id!)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {collection.description && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{collection.description}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
