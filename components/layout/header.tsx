"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "./sidebar-context"

export function Header() {
  const { toggle } = useSidebar()

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center px-4 md:px-6 lg:px-8 py-3 md:py-4">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          {/* Hamburger menu for mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={toggle}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="min-w-0 flex-1">
            <h2 className="text-lg md:text-xl lg:text-2xl font-serif font-semibold text-foreground truncate">Research Dashboard</h2>
            <p className="text-xs md:text-sm text-muted-foreground hidden sm:block truncate">Discover and synthesize academic knowledge</p>
          </div>
        </div>
      </div>
    </header>
  )
}
