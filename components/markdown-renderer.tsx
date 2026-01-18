import React from 'react'
import { JSX } from 'react/jsx-runtime';

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const renderContent = (text: string) => {
    if (!text) return null

    // Split by double newlines to get paragraphs
    const sections = text.split('\n\n')
    
    return sections.map((section, index) => {
      const trimmed = section.trim()
      if (!trimmed) return null

      // Handle headers (lines starting with # or all caps followed by colon)
      if (trimmed.match(/^#{1,3}\s+(.+)$/)) {
        const level = trimmed.match(/^(#{1,3})/)?.[0].length || 1
        const text = trimmed.replace(/^#{1,3}\s+/, '')
        const HeadingTag = `h${Math.min(level + 1, 6)}` as keyof JSX.IntrinsicElements
        return (
          <HeadingTag key={index} className="font-semibold text-foreground mb-3 mt-6 first:mt-0">
            {text}
          </HeadingTag>
        )
      }

      // Handle section headers (all caps or numbered sections)
      if (trimmed.match(/^[A-Z\s]+:/) || trimmed.match(/^\d+\.\s+[A-Z]/)) {
        return (
          <h3 key={index} className="font-semibold text-foreground mb-3 mt-6 first:mt-0">
            {trimmed}
          </h3>
        )
      }

      // Handle bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items = trimmed.split('\n').filter(line => line.startsWith('- ') || line.startsWith('* '))
        return (
          <ul key={index} className="list-disc list-inside space-y-2 mb-4 text-foreground/90">
            {items.map((item, i) => (
              <li key={i}>{item.replace(/^[-*]\s+/, '')}</li>
            ))}
          </ul>
        )
      }

      // Handle numbered lists
      if (trimmed.match(/^\d+\.\s/)) {
        const items = trimmed.split('\n').filter(line => line.match(/^\d+\.\s/))
        return (
          <ol key={index} className="list-decimal list-inside space-y-2 mb-4 text-foreground/90">
            {items.map((item, i) => (
              <li key={i}>{item.replace(/^\d+\.\s+/, '')}</li>
            ))}
          </ol>
        )
      }

      // Handle bold text **text**
      const withBold = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

      // Regular paragraph
      return (
        <p 
          key={index} 
          className="text-foreground/90 leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: withBold }}
        />
      )
    })
  }

  return (
    <div className="space-y-1">
      {renderContent(content)}
    </div>
  )
}
