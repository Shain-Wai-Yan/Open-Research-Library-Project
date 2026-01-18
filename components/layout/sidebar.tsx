"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, Library, Lightbulb, FileText, Network, BarChart3, Settings, BookOpen, Bug, MessageSquare, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "./sidebar-context"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Search", href: "/dashboard", icon: Search },
  { name: "Library", href: "/library", icon: Library },
  { name: "Insights", href: "/insights", icon: Lightbulb },
  { name: "Reviews", href: "/reviews", icon: FileText },
  { name: "AI Assistant", href: "/assistant", icon: MessageSquare },
  { name: "Networks", href: "/networks", icon: Network },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isOpen, setIsOpen } = useSidebar()

  const handleLinkClick = () => {
    // Close sidebar on mobile when clicking a link
    if (window.innerWidth < 1024) {
      setIsOpen(false)
    }
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 h-screen w-64 border-r border-border bg-card flex flex-col z-50 transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3" onClick={handleLinkClick}>
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-serif text-xl font-semibold text-foreground">Open Research</h1>
                <p className="text-xs text-muted-foreground">Library</p>
              </div>
            </Link>
            
            {/* Close button for mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Settings and Debug */}
        <div className="p-4 border-t border-border space-y-1">
          <Link
            href="/test-supabase"
            onClick={handleLinkClick}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
              pathname === "/test-supabase"
                ? "bg-amber-500 text-white"
                : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950",
            )}
          >
            <Bug className="w-5 h-5" />
            Supabase Debug
          </Link>
          <Link
            href="/settings"
            onClick={handleLinkClick}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </div>
      </aside>
    </>
  )
}
