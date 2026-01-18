"use client"

import React from "react"

import { useState, useEffect, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    puter: {
      ai: {
        chat: (message: string, options: { model: string; stream?: boolean }) => Promise<any>
      }
    }
  }
}

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const AI_MODELS = [
  { id: "perplexity/sonar", name: "Sonar - Quick Answers", description: "Fast responses" },
  { id: "perplexity/sonar-pro", name: "Sonar Pro - Professional", description: "Comprehensive analysis" },
  { id: "perplexity/sonar-deep-research", name: "Sonar Deep - Research", description: "In-depth research" },
  { id: "perplexity/sonar-reasoning-pro", name: "Sonar Reasoning - Analytical", description: "Complex reasoning" },
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [selectedModel, setSelectedModel] = useState("perplexity/sonar-pro")
  const [isLoading, setIsLoading] = useState(false)
  const [puterReady, setPuterReady] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const checkPuter = setInterval(() => {
      if (window.puter) {
        console.log("[v0] Puter.js ready for assistant")
        setPuterReady(true)
        clearInterval(checkPuter)
      }
    }, 100)

    const timeout = setTimeout(() => {
      clearInterval(checkPuter)
    }, 10000)

    return () => {
      clearInterval(checkPuter)
      clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, streamingMessage])

  const handleSend = async () => {
    if (!input.trim() || isLoading || !puterReady) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setStreamingMessage("")

    try {
      const systemPrompt = `You are a research assistant for an academic library platform. Help users with:
- Finding and understanding research papers
- Analyzing academic topics
- Synthesizing information from multiple sources
- Understanding research methodologies
- Identifying research gaps
- Literature review guidance

Provide clear, accurate, and academic responses. Use proper citations when referencing known research areas.`

      const response = await window.puter.ai.chat(
        `${systemPrompt}\n\nUser: ${userMessage.content}`,
        {
          model: selectedModel,
          stream: true,
        }
      )

      let fullText = ""
      for await (const part of response) {
        if (part?.text) {
          fullText += part.text
          setStreamingMessage(fullText)
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fullText,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      setStreamingMessage("")
    } catch (error) {
      console.error("[v0] Assistant error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 ml-64 flex flex-col">
        <Header />

        <div className="flex-1 flex flex-col p-8">
          <div className="max-w-5xl mx-auto w-full flex flex-col h-[calc(100vh-12rem)]">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-serif font-bold text-foreground mb-2">AI Research Assistant</h1>
                  <p className="text-lg text-muted-foreground">
                    Get help with papers, research questions, and academic insights
                  </p>
                </div>
                {puterReady ? (
                  <Badge variant="secondary" className="h-fit">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="h-fit">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Loading...
                  </Badge>
                )}
              </div>

              {/* Model Selector */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Model:</span>
                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{model.name}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chat Area */}
            <Card className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
                {messages.length === 0 && !streamingMessage && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Welcome to AI Research Assistant</h3>
                      <p className="text-muted-foreground mb-6">
                        Ask me anything about research papers, methodologies, or academic topics
                      </p>
                      <div className="grid gap-2 text-sm">
                        <Card className="p-3 bg-secondary/50 border-none">
                          <p className="text-left">"Explain the difference between qualitative and quantitative research"</p>
                        </Card>
                        <Card className="p-3 bg-secondary/50 border-none">
                          <p className="text-left">"What are common research gaps in AI ethics?"</p>
                        </Card>
                        <Card className="p-3 bg-secondary/50 border-none">
                          <p className="text-left">"Help me understand meta-analysis methodology"</p>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-4",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Bot className="w-5 h-5 text-primary-foreground" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "rounded-lg px-4 py-3 max-w-[80%]",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <p className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-accent-foreground" />
                        </div>
                      )}
                    </div>
                  ))}

                  {streamingMessage && (
                    <div className="flex gap-4 justify-start">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Bot className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div className="rounded-lg px-4 py-3 max-w-[80%] bg-secondary text-secondary-foreground">
                        <p className="whitespace-pre-wrap leading-relaxed">{streamingMessage}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                          <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-75" />
                          <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-150" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <CardContent className="p-4 border-t">
                <div className="flex gap-3">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={puterReady ? "Ask me anything about research..." : "Loading AI..."}
                    disabled={!puterReady || isLoading}
                    rows={3}
                    className="resize-none"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || !puterReady}
                    size="lg"
                    className="shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
