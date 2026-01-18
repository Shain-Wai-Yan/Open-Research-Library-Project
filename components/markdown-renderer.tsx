import React from 'react'
import { JSX } from 'react/jsx-runtime'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Pre-process content to clean up formatting issues
  const cleanContent = (text: string): string => {
    return text
      // Remove lines that are just asterisks or symbols
      .replace(/^\s*[\*\-\_]{1,}\s*$/gm, '')
      // Remove excessive asterisks (3 or more in a row not followed by text)
      .replace(/\*{3,}(?!\w)/g, '')
      // Fix malformed bold markers
      .replace(/\*\*\s*\*\*/g, '')
      // Remove orphaned asterisks at start of sentences
      .replace(/(?<=\s|^)\*(?!\*|\s*\w+\*)/g, '')
      // Clean up double spaces
      .replace(/  +/g, ' ')
      // Remove empty lines at start
      .replace(/^\n+/, '')
      // Normalize line breaks
      .replace(/\n{3,}/g, '\n\n')
  }

  const processInlineFormatting = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let keyIndex = 0
    
    // Process text sequentially for better control
    // Handle bold, italic, citations, and inline code
    const regex = /(\*\*\*([^\*]+)\*\*\*|\*\*([^\*]+)\*\*|\*([^\*\s][^\*]*[^\*\s])\*|`([^`]+)`|\[(\d+)\]|\(([A-Z][a-zA-Z\s&]+(?:et al\.?)?,?\s*\d{4}[a-z]?)\))/g
    let match
    
    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index)
        if (beforeText) {
          parts.push(beforeText)
        }
      }
      
      keyIndex++
      
      // Process the match
      if (match[2]) {
        // Bold + Italic (***text***)
        parts.push(<strong key={`bi-${keyIndex}`}><em>{match[2]}</em></strong>)
      } else if (match[3]) {
        // Bold (**text**)
        parts.push(<strong key={`b-${keyIndex}`} className="font-semibold">{match[3]}</strong>)
      } else if (match[4]) {
        // Italic (*text*) - only if it looks like intentional emphasis
        parts.push(<em key={`i-${keyIndex}`}>{match[4]}</em>)
      } else if (match[5]) {
        // Inline code (`code`)
        parts.push(
          <code key={`c-${keyIndex}`} className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
            {match[5]}
          </code>
        )
      } else if (match[6]) {
        // Citation [1]
        parts.push(
          <sup key={`cite-${keyIndex}`} className="text-accent font-medium">
            [{match[6]}]
          </sup>
        )
      } else if (match[7]) {
        // Academic citation (Author et al., Year)
        parts.push(
          <span key={`ref-${keyIndex}`} className="text-accent/90">
            ({match[7]})
          </span>
        )
      }
      
      lastIndex = regex.lastIndex
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex)
      // Clean up any stray asterisks in remaining text
      const cleanedRemaining = remainingText.replace(/(?<!\*)\*(?!\*)/g, '')
      if (cleanedRemaining) {
        parts.push(cleanedRemaining)
      }
    }
    
    return parts.length > 0 ? parts : [text.replace(/(?<!\*)\*(?!\*)/g, '')]
  }

  const renderContent = (text: string) => {
    if (!text) return null

    // Clean the content first
    const cleanedText = cleanContent(text)
    const lines = cleanedText.split('\n')
    const elements: React.ReactNode[] = []
    let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null
    let currentParagraph: string[] = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    let elementKey = 0

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim()
        if (paragraphText && paragraphText.length > 1) {
          elementKey++
          elements.push(
            <p key={`p-${elementKey}`} className="text-foreground/90 leading-relaxed mb-4">
              {processInlineFormatting(paragraphText)}
            </p>
          )
        }
        currentParagraph = []
      }
    }

    const flushList = () => {
      if (currentList) {
        elementKey++
        const ListTag = currentList.type
        elements.push(
          <ListTag 
            key={`list-${elementKey}`} 
            className={`${currentList.type === 'ul' ? 'list-disc' : 'list-decimal'} list-outside space-y-2 mb-4 ml-6 text-foreground/90`}
          >
            {currentList.items.map((item, i) => (
              <li key={`item-${i}`} className="leading-relaxed pl-1">
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
        elementKey++
        elements.push(
          <pre key={`code-${elementKey}`} className="bg-muted p-4 rounded-lg mb-4 overflow-x-auto">
            <code className="text-sm font-mono">{codeBlockContent.join('\n')}</code>
          </pre>
        )
        codeBlockContent = []
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
        }
        continue
      }

      if (inCodeBlock) {
        codeBlockContent.push(line)
        continue
      }

      // Skip lines that are just asterisks or dashes (malformed separators)
      if (/^[\*\-\_\s]+$/.test(trimmed) && trimmed.length < 10) {
        continue
      }

      // Empty line - flush current paragraph
      if (!trimmed) {
        flushParagraph()
        flushList()
        continue
      }

      // Headers - support both # and ** header styles
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
      const boldHeaderMatch = trimmed.match(/^\*\*([^*]+)\*\*\s*$/)
      
      if (headerMatch) {
        flushParagraph()
        flushList()
        const level = headerMatch[1].length
        const headerText = headerMatch[2].replace(/\*+/g, '').trim()
        
        if (!headerText) continue
        
        elementKey++
        const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements
        const className = level === 1 
          ? "text-2xl font-bold text-foreground mb-4 mt-8 first:mt-0 font-serif"
          : level === 2
          ? "text-xl font-bold text-foreground mb-3 mt-6 first:mt-0 font-serif"
          : "text-lg font-semibold text-foreground mb-3 mt-5 first:mt-0"
        
        elements.push(
          <HeadingTag key={`h-${elementKey}`} className={className}>
            {headerText}
          </HeadingTag>
        )
        continue
      }
      
      // Bold-only lines treated as headers (common in AI output)
      if (boldHeaderMatch) {
        flushParagraph()
        flushList()
        const headerText = boldHeaderMatch[1].trim()
        
        if (!headerText || headerText.length < 2) continue
        
        elementKey++
        elements.push(
          <h3 key={`bh-${elementKey}`} className="text-lg font-semibold text-foreground mb-3 mt-5 first:mt-0">
            {headerText}
          </h3>
        )
        continue
      }

      // Unordered list items
      const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/)
      if (ulMatch) {
        flushParagraph()
        const itemText = ulMatch[1].replace(/^\*+\s*/, '').trim()
        if (itemText) {
          if (!currentList || currentList.type !== 'ul') {
            flushList()
            currentList = { type: 'ul', items: [] }
          }
          currentList.items.push(itemText)
        }
        continue
      }

      // Ordered list items
      const olMatch = trimmed.match(/^\d+[\.\)]\s+(.+)$/)
      if (olMatch) {
        flushParagraph()
        const itemText = olMatch[1].replace(/^\*+\s*/, '').trim()
        if (itemText) {
          if (!currentList || currentList.type !== 'ol') {
            flushList()
            currentList = { type: 'ol', items: [] }
          }
          currentList.items.push(itemText)
        }
        continue
      }

      // Blockquote
      if (trimmed.startsWith('> ')) {
        flushParagraph()
        flushList()
        const quoteText = trimmed.substring(2)
        elementKey++
        elements.push(
          <blockquote key={`quote-${elementKey}`} className="border-l-4 border-accent pl-4 italic text-foreground/80 mb-4">
            {processInlineFormatting(quoteText)}
          </blockquote>
        )
        continue
      }

      // Horizontal rule
      if (/^(---|\*\*\*|___)$/.test(trimmed)) {
        flushParagraph()
        flushList()
        elementKey++
        elements.push(<hr key={`hr-${elementKey}`} className="my-6 border-border" />)
        continue
      }

      // Regular text - add to current paragraph
      // Clean up any stray asterisks before adding
      const cleanedLine = trimmed
        .replace(/^\*+\s*/, '') // Remove leading asterisks
        .replace(/\s*\*+$/, '') // Remove trailing asterisks
        .trim()
      
      if (cleanedLine && cleanedLine.length > 1) {
        currentParagraph.push(cleanedLine)
      }
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
