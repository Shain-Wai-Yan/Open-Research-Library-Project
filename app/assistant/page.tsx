"use client"

import { CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import React from "react"
import { useState, useEffect, useRef } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
import { Card } from "@/components/ui/card"
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
  StopCircle,
  History,
  ChevronDown,
  BookOpen,
  Zap,
  MessageSquare,
  MoreHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { toast } from "sonner"

const SUGGESTED_PROMPTS = [
  { title: "Paper Summary", prompt: "Summarize the key points of this research paper." },
  { title: "Question Answering", prompt: "Answer the following research question." },
  { title: "Literature Review", prompt: "Provide a literature review on this topic." },
  { title: "Methodology", prompt: "Explain the methodology used in this study." },
]

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
  { id: "deepseek-chat", name: "DeepSeek Chat", description: "Fast & balanced", icon: Zap },
  { id: "deepseek-reasoner", name: "DeepSeek Reasoner", description: "Deep analysis", icon: BookOpen },
  { id: "groq-llama", name: "Llama 3.3 70B", description: "Professional", icon: Sparkles },
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
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

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
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
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

  const currentModel = AI_MODELS.find(m => m.id === selectedModel)
  const ModelIcon = currentModel?.icon || Sparkles

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 lg:ml-64 flex flex-col h-screen">
        <Header />

        {/* Chat Container - Full Height */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar - Minimal */}
          <div className="border-b px-6 py-3 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-3">
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
                <SelectTrigger className="w-[180px] border-0 bg-transparent">
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
                          <span className="font-medium">{model.name}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                disabled={isLoading}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
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

          {/* Messages Area - Scrollable */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-6"
          >
            <div className="max-w-3xl mx-auto">
              {messages.length === 0 && !streamingMessage && (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                      <Bot className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">AI Research Assistant</h3>
                    <p className="text-muted-foreground text-sm">
                      Ask me anything about research, papers, or academic topics
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1",
                        message.role === "assistant" ? "bg-primary" : "bg-muted"
                      )}>
                        {message.role === "assistant" ? (
                          <Bot className="w-4 h-4 text-primary-foreground" />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-2 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {message.role === "assistant" ? "Assistant" : "You"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className="text-sm">
                          {message.role === "assistant" ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:p-0">
                              <MarkdownRenderer content={message.content} />
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                              {message.content}
                            </p>
                          )}
                        </div>

                        {message.role === "assistant" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleCopy(message.content, message.id)}
                          >
                            {copiedId === message.id ? (
                              <>
                                <Check className="w-3 h-3 mr-1.5" />
                                <span className="text-xs">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 mr-1.5" />
                                <span className="text-xs">Copy</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {streamingMessage && (
                  <div className="group">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                      
                      <div className="flex-1 space-y-2 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Assistant</span>
                          <div className="flex items-center gap-1">
                            <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                            <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                            <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                          </div>
                        </div>
                        
                        <div className="text-sm prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:p-0">
                          <MarkdownRenderer content={streamingMessage} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Input Area - Fixed Bottom */}
          <div className="border-t bg-background px-4 py-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about research, papers, or academic topics..."
                  disabled={isLoading}
                  rows={1}
                  className="resize-none min-h-[44px] max-h-[200px]"
                />
                {isLoading ? (
                  <Button
                    onClick={handleStop}
                    size="icon"
                    variant="ghost"
                    className="shrink-0 h-[44px] w-[44px]"
                  >
                    <StopCircle className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="shrink-0 h-[44px] w-[44px]"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Enter to send • Shift+Enter for new line
              </p>
            </div>
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
