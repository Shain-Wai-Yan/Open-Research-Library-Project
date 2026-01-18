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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2, 
  Copy, 
  Check, 
  Download,
  Trash2,
  RotateCcw,
  StopCircle,
  History,
  Save,
  ChevronDown,
  BookOpen,
  Zap,
  MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { toast } from "sonner"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

type Conversation = {
  id: string
  title: string
  messages: Message[]
  model: string
  createdAt: Date
  updatedAt: Date
}

const AI_MODELS = [
  { id: "deepseek-chat", name: "DeepSeek Chat", description: "Fast & balanced responses", icon: Zap },
  { id: "deepseek-reasoner", name: "DeepSeek Reasoner", description: "Deep analytical thinking", icon: BookOpen },
  { id: "groq-llama", name: "Llama 3.3 70B", description: "Professional grade quality", icon: Sparkles },
]

const SUGGESTED_PROMPTS = [
  {
    title: "Research Methodology",
    prompt: "Explain the key differences between qualitative and quantitative research methods, with examples."
  },
  {
    title: "Literature Review",
    prompt: "What's the best approach to conducting a systematic literature review? Give me a step-by-step guide."
  },
  {
    title: "Research Gaps",
    prompt: "How do I identify and articulate research gaps in AI ethics and responsible AI development?"
  },
  {
    title: "Statistical Analysis",
    prompt: "Explain when to use different statistical tests (t-test, ANOVA, chi-square) in research."
  },
  {
    title: "Meta-Analysis",
    prompt: "Walk me through the process of conducting a meta-analysis, including key considerations and pitfalls."
  },
  {
    title: "Citation Practices",
    prompt: "What are best practices for citation management and avoiding plagiarism in academic writing?"
  },
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [selectedModel, setSelectedModel] = useState("deepseek-chat")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load conversations from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ai-conversations')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setConversations(parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        })))
      } catch (e) {
        console.error('[v0] Failed to load conversations:', e)
      }
    }
  }, [])

  // Save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('ai-conversations', JSON.stringify(conversations))
    }
  }, [conversations])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingMessage])

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSend = async (messageText?: string) => {
    const messageToSend = messageText || input.trim()
    if (!messageToSend || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageToSend,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setStreamingMessage("")

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          model: selectedModel,
          history: messages.slice(-10),
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk
          setStreamingMessage(fullText)
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fullText,
        timestamp: new Date(),
      }

      setMessages((prev) => {
        const updatedMessages = [...prev, assistantMessage]
        
        // Save or update conversation
        if (currentConversationId) {
          setConversations(convs => convs.map(c => 
            c.id === currentConversationId 
              ? { ...c, messages: updatedMessages, updatedAt: new Date() }
              : c
          ))
        } else {
          // Create new conversation
          const newConv: Conversation = {
            id: Date.now().toString(),
            title: userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : ''),
            messages: updatedMessages,
            model: selectedModel,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          setConversations(convs => [newConv, ...convs])
          setCurrentConversationId(newConv.id)
        }
        
        return updatedMessages
      })
      setStreamingMessage("")
      toast.success('Response generated successfully')
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('Generation stopped')
        setStreamingMessage("")
      } else {
        console.error("[v0] Assistant error:", error)
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
        toast.error('Failed to generate response')
      }
    } finally {
      setIsLoading(false)
      setAbortController(null)
    }
  }

  const handleStop = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleClearChat = () => {
    setMessages([])
    setCurrentConversationId(null)
    setStreamingMessage("")
    toast.success('Chat cleared')
  }

  const handleExportChat = () => {
    const exportData = {
      conversation: currentConversationId 
        ? conversations.find(c => c.id === currentConversationId)
        : { messages, model: selectedModel, timestamp: new Date() },
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Chat exported')
  }

  const handleLoadConversation = (conv: Conversation) => {
    setMessages(conv.messages)
    setSelectedModel(conv.model)
    setCurrentConversationId(conv.id)
    setShowHistoryDialog(false)
    toast.success('Conversation loaded')
  }

  const handleDeleteConversation = (convId: string) => {
    setConversations(convs => convs.filter(c => c.id !== convId))
    if (currentConversationId === convId) {
      setMessages([])
      setCurrentConversationId(null)
    }
    toast.success('Conversation deleted')
  }

  const handleNewChat = () => {
    setMessages([])
    setCurrentConversationId(null)
    setStreamingMessage("")
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  const currentModel = AI_MODELS.find(m => m.id === selectedModel)
  const ModelIcon = currentModel?.icon || Sparkles

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 ml-64 flex flex-col">
        <Header />

        <div className="flex-1 flex flex-col p-6 lg:p-8">
          <div className="max-w-6xl mx-auto w-full flex flex-col h-[calc(100vh-10rem)]">
            {/* Enhanced Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-serif font-bold text-foreground mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-primary-foreground" />
                    </div>
                    AI Research Assistant
                  </h1>
                  <p className="text-base lg:text-lg text-muted-foreground">
                    Get expert help with papers, research questions, and academic insights
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="h-fit hidden sm:flex">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                  </Badge>
                </div>
              </div>

              {/* Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground hidden sm:block">Model:</span>
                  <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
                    <SelectTrigger className="w-[200px] lg:w-[280px]">
                      <div className="flex items-center gap-2">
                        <ModelIcon className="w-4 h-4" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((model) => {
                        const Icon = model.icon
                        return (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{model.name}</span>
                                <span className="text-xs text-muted-foreground">{model.description}</span>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNewChat}
                    disabled={isLoading}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    New Chat
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setShowHistoryDialog(true)}>
                        <History className="w-4 h-4 mr-2" />
                        History ({conversations.length})
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportChat} disabled={messages.length === 0}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Chat
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleClearChat} 
                        disabled={messages.length === 0}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Enhanced Chat Area */}
            <Card className="flex-1 flex flex-col overflow-hidden border-2">
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 lg:p-6">
                {messages.length === 0 && !streamingMessage && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-2xl px-4">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-6">
                        <Bot className="w-10 h-10 text-primary-foreground" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-3">Welcome to AI Research Assistant</h3>
                      <p className="text-muted-foreground mb-8 text-lg">
                        Your intelligent companion for academic research and analysis
                      </p>
                      
                      <div className="text-left">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Suggested Prompts</h4>
                        <div className="grid gap-2">
                          {SUGGESTED_PROMPTS.slice(0, 4).map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestedPrompt(suggestion.prompt)}
                              className="group p-4 bg-gradient-to-r from-secondary/50 to-secondary/30 hover:from-secondary hover:to-secondary/50 border border-border/50 hover:border-primary/50 rounded-lg text-left transition-all duration-200 hover:scale-[1.02]"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="font-medium text-sm mb-1 text-foreground">{suggestion.title}</p>
                                  <p className="text-sm text-muted-foreground line-clamp-2">{suggestion.prompt}</p>
                                </div>
                                <Send className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3 lg:gap-4 group",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                          <Bot className="w-5 h-5 text-primary-foreground" />
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 max-w-[85%] relative",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/80 text-secondary-foreground border border-border/50"
                        )}
                      >
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <MarkdownRenderer content={message.content} />
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        )}
                        
                        <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-current/10">
                          <p className="text-xs opacity-60">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          
                          {message.role === "assistant" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleCopy(message.content, message.id)}
                            >
                              {copiedId === message.id ? (
                                <>
                                  <Check className="w-3 h-3 mr-1" />
                                  <span className="text-xs">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 mr-1" />
                                  <span className="text-xs">Copy</span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-accent-foreground" />
                        </div>
                      )}
                    </div>
                  ))}

                  {streamingMessage && (
                    <div className="flex gap-3 lg:gap-4 justify-start">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 animate-pulse">
                        <Bot className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div className="rounded-2xl px-4 py-3 max-w-[85%] bg-secondary/80 text-secondary-foreground border border-border/50">
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <MarkdownRenderer content={streamingMessage} />
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-current/10">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                          </div>
                          <span className="text-xs text-muted-foreground ml-2">Generating...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Enhanced Input Area */}
              <CardContent className="p-4 border-t bg-muted/30">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask me anything about research, papers, or academic topics..."
                      disabled={isLoading}
                      rows={3}
                      className="resize-none pr-12 bg-background"
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                      {input.length}/2000
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {isLoading ? (
                      <Button
                        onClick={handleStop}
                        size="lg"
                        variant="destructive"
                        className="shrink-0"
                      >
                        <StopCircle className="w-5 h-5" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isLoading}
                        size="lg"
                        className="shrink-0"
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">Enter</kbd> to send, 
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground border ml-1">Shift + Enter</kbd> for new line
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <ModelIcon className="w-3 h-3 mr-1" />
                      {currentModel?.name}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Conversation History
            </DialogTitle>
            <DialogDescription>
              View and load your previous conversations
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No conversation history yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <Card 
                  key={conv.id} 
                  className={cn(
                    "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                    currentConversationId === conv.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleLoadConversation(conv)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate mb-1">{conv.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{conv.messages.length} messages</span>
                        <span>•</span>
                        <span>{conv.updatedAt.toLocaleDateString()}</span>
                        <span>•</span>
                        <Badge variant="secondary" className="text-xs">
                          {AI_MODELS.find(m => m.id === conv.model)?.name || conv.model}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteConversation(conv.id)
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
