"use client"

import { useState } from "react"
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
import { localStorageAPI } from "@/lib/mock-api"
import type { Collection } from "@/lib/types"

const COLLECTION_COLORS = ["bg-accent", "bg-emerald-500", "bg-blue-500", "bg-rose-500", "bg-purple-500"]

export function CollectionManager() {
  const [collections, setCollections] = useState<Collection[]>(localStorageAPI.getCollections())
  const [isOpen, setIsOpen] = useState(false)
  const [newCollection, setNewCollection] = useState({ name: "", description: "" })

  const handleCreate = () => {
    const collection: Collection = {
      id: Date.now().toString(),
      name: newCollection.name,
      description: newCollection.description,
      paperIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: COLLECTION_COLORS[Math.floor(Math.random() * COLLECTION_COLORS.length)],
    }
    localStorageAPI.saveCollection(collection)
    setCollections([...collections, collection])
    setNewCollection({ name: "", description: "" })
    setIsOpen(false)
  }

  const handleDelete = (id: string) => {
    localStorageAPI.deleteCollection(id)
    setCollections(collections.filter((c) => c.id !== id))
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
              <Button onClick={handleCreate} className="w-full">
                Create Collection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((collection) => (
          <Card key={collection.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${collection.color} flex items-center justify-center`}>
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold">{collection.name}</h4>
                  <p className="text-xs text-muted-foreground">{collection.paperIds.length} papers</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(collection.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            {collection.description && (
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{collection.description}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
