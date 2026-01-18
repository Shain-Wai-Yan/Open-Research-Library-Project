import React from 'react'
import { JSX } from 'react/jsx-runtime' // Import JSX for type definitions

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const processInlineFormatting = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    
    // Combined regex for bold, italic, citations, and inline code
    const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(\d+)\])/g
    let match
    
    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      
      // Process the match
      if (match[2]) {
        // Bold + Italic (***text***)
        parts.push(<strong key={match.index}><em>{match[2]}</em></strong>)
      } else if (match[3]) {
        // Bold (**text**)
        parts.push(<strong key={match.index}>{match[3]}</strong>)
      } else if (match[4]) {
        // Italic (*text*)
        parts.push(<em key={match.index}>{match[4]}</em>)
      } else if (match[5]) {
        // Inline code (`code`)
        parts.push(
          <code key={match.index} className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
            {match[5]}
          </code>
        )
      } else if (match[6]) {
        // Citation [1]
        parts.push(
          <sup key={match.index} className="text-accent font-medium">
            [{match[6]}]
          </sup>
        )
      }
      
      lastIndex = regex.lastIndex
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return parts.length > 0 ? parts : [text]
  }

  const renderContent = (text: string) => {
    if (!text) return null

    const lines = text.split('\n')
    const elements: React.ReactNode[] = []
    let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null
    let currentParagraph: string[] = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    let codeBlockLang = ''

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim()
        if (paragraphText) {
          elements.push(
            <p key={elements.length} className="text-foreground/90 leading-relaxed mb-4">
              {processInlineFormatting(paragraphText)}
            </p>
          )
        }
        currentParagraph = []
      }
    }

    const flushList = () => {
      if (currentList) {
        const ListTag = currentList.type
        elements.push(
          <ListTag key={elements.length} className={`list-${currentList.type === 'ul' ? 'disc' : 'decimal'} list-inside space-y-2 mb-4 ml-4`}>
            {currentList.items.map((item, i) => (
              <li key={i} className="text-foreground/90">
                {processInlineFormatting(item)}
              </li>
            ))}
          </ListTag>
        )
        currentList = null
      }
    }

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        elements.push(
          <pre key={elements.length} className="bg-muted p-4 rounded-lg mb-4 overflow-x-auto">
            <code className="text-sm font-mono">{codeBlockContent.join('\n')}</code>
          </pre>
        )
        codeBlockContent = []
        codeBlockLang = ''
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Handle code blocks
      if (trimmed.startsWith('```')) {
        flushParagraph()
        flushList()
        if (inCodeBlock) {
          flushCodeBlock()
          inCodeBlock = false
        } else {
          inCodeBlock = true
          codeBlockLang = trimmed.substring(3)
        }
        continue
      }

      if (inCodeBlock) {
        codeBlockContent.push(line)
        continue
      }

      // Empty line - flush current paragraph
      if (!trimmed) {
        flushParagraph()
        flushList()
        continue
      }

      // Headers
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
      if (headerMatch) {
        flushParagraph()
        flushList()
        const level = headerMatch[1].length
        const headerText = headerMatch[2]
        const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements
        const className = level === 1 
          ? "text-2xl font-bold text-foreground mb-4 mt-8 first:mt-0"
          : level === 2
          ? "text-xl font-bold text-foreground mb-3 mt-6 first:mt-0"
          : "text-lg font-semibold text-foreground mb-3 mt-5 first:mt-0"
        
        elements.push(
          <HeadingTag key={elements.length} className={className}>
            {processInlineFormatting(headerText)}
          </HeadingTag>
        )
        continue
      }

      // Unordered list items
      if (trimmed.match(/^[-*+]\s+/)) {
        flushParagraph()
        const itemText = trimmed.replace(/^[-*+]\s+/, '')
        if (!currentList || currentList.type !== 'ul') {
          flushList()
          currentList = { type: 'ul', items: [] }
        }
        currentList.items.push(itemText)
        continue
      }

      // Ordered list items
      const olMatch = trimmed.match(/^\d+\.\s+(.+)$/)
      if (olMatch) {
        flushParagraph()
        const itemText = olMatch[1]
        if (!currentList || currentList.type !== 'ol') {
          flushList()
          currentList = { type: 'ol', items: [] }
        }
        currentList.items.push(itemText)
        continue
      }

      // Blockquote
      if (trimmed.startsWith('> ')) {
        flushParagraph()
        flushList()
        const quoteText = trimmed.substring(2)
        elements.push(
          <blockquote key={elements.length} className="border-l-4 border-accent pl-4 italic text-foreground/80 mb-4">
            {processInlineFormatting(quoteText)}
          </blockquote>
        )
        continue
      }

      // Horizontal rule
      if (trimmed.match(/^(---|\*\*\*|___)$/)) {
        flushParagraph()
        flushList()
        elements.push(<hr key={elements.length} className="my-6 border-border" />)
        continue
      }

      // Regular text - add to current paragraph
      currentParagraph.push(trimmed)
    }

    // Flush remaining content
    flushParagraph()
    flushList()
    flushCodeBlock()

    return elements
  }

  return (
    <div className="prose prose-sm sm:prose-base max-w-none">
      {renderContent(content)}
    </div>
  )
}
