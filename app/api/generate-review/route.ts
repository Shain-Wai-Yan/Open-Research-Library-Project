import { NextRequest } from 'next/server'

export const runtime = 'edge'

interface GenerateRequest {
  researchQuestion: string
  model: string
}

const ACADEMIC_SYSTEM_PROMPT = `You are an expert academic researcher and literature review specialist with extensive experience in synthesizing scholarly work. Your task is to generate comprehensive, publication-quality literature reviews.

CRITICAL FORMATTING RULES:
1. Use proper Markdown formatting with clear section headers (## for main sections, ### for subsections)
2. Write in complete, well-structured sentences and paragraphs
3. NEVER use asterisks (*) for emphasis within sentences - use proper prose instead
4. Use numbered lists (1. 2. 3.) for sequential items
5. Use bullet points (- ) sparingly and only for discrete list items
6. Include proper academic citations in the format (Author et al., Year) throughout the text
7. Ensure smooth transitions between sections and paragraphs
8. Write in formal academic English with proper grammar

CONTENT REQUIREMENTS:
- Provide substantive analysis, not surface-level summaries
- Discuss methodological approaches used in the field
- Identify research gaps and contradictions in the literature
- Synthesize findings across multiple studies
- Include specific examples and evidence
- Maintain critical and analytical perspective throughout`

function buildPrompt(researchQuestion: string, model: string): string {
  const isDeepReasoning = model === 'deepseek-reasoner' || model === 'reasoning'
  
  const basePrompt = `Generate a comprehensive, publication-quality literature review on the following research question:

**Research Question:** ${researchQuestion}

Structure your review with the following sections:

## Executive Summary
Write a concise 150-200 word overview that captures the key findings, significance of the research area, main themes identified, and primary conclusions. This should stand alone as a complete summary of the review.

## Introduction and Background
Provide thorough context including:
- The significance and relevance of this research area
- Historical development of the field
- Key definitions and conceptual frameworks
- The scope and objectives of this review
- Why this topic matters to researchers and practitioners

## Key Themes and Findings
Identify and discuss 4-6 major themes from the literature:
- Present each theme with supporting evidence from multiple sources
- Discuss areas of consensus and debate among researchers
- Highlight seminal studies and their contributions
- Connect findings across different themes where relevant

## Methodological Approaches
Analyze the research methods commonly used:
- Quantitative approaches (surveys, experiments, statistical analysis)
- Qualitative approaches (interviews, case studies, ethnography)
- Mixed-methods designs
- Discuss strengths and limitations of prevalent methodologies
- Note any methodological innovations or trends

## Current Research Gaps
Critically identify gaps in the existing literature:
- Underexplored aspects of the topic
- Methodological limitations in current research
- Populations or contexts not adequately studied
- Conflicting findings that need resolution
- Theoretical gaps that need addressing

## Future Research Directions
Propose specific, actionable research directions:
- Questions that emerge from identified gaps
- Methodological approaches that could address current limitations
- Emerging areas that warrant investigation
- Potential interdisciplinary connections

## Conclusion
Synthesize the key insights:
- Summarize the current state of knowledge
- Emphasize the most significant findings and themes
- Discuss implications for theory and practice
- Provide a forward-looking perspective on the field

## References
Include a properly formatted reference list with 15-25 relevant academic sources in APA format. Include a mix of seminal works and recent publications.

IMPORTANT: Write in clear, flowing academic prose. Do not use excessive formatting symbols. Ensure all sections have substantial content with proper citations throughout.`

  if (isDeepReasoning) {
    return `${basePrompt}

Additional Instructions for Deep Analysis:
- Provide more nuanced critical analysis of methodological approaches
- Include discussion of theoretical frameworks underlying the research
- Explore contradictions and debates within the literature more thoroughly
- Consider interdisciplinary perspectives where relevant
- Discuss the evolution of thinking in this area over time`
  }

  return basePrompt
}

export async function POST(req: NextRequest) {
  try {
    const { researchQuestion, model }: GenerateRequest = await req.json()

    if (!researchQuestion) {
      return new Response(JSON.stringify({ error: 'Research question is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const prompt = buildPrompt(researchQuestion, model)

    // Try DeepSeek first (primary)
    let response = await callDeepSeek(prompt, model)
    
    // If DeepSeek fails, fallback to Groq
    if (!response.ok) {
      console.log('[v0] DeepSeek failed, falling back to Groq')
      response = await callGroq(prompt, model)
    }

    if (!response.ok) {
      const errorData = await response.json()
      return new Response(
        JSON.stringify({ 
          error: errorData.error?.message || 'Failed to generate review from both providers' 
        }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Return streaming response
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('[v0] API Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

async function callDeepSeek(prompt: string, model: string): Promise<Response> {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    console.log('[v0] DeepSeek API key not found')
    return new Response(JSON.stringify({ error: 'DeepSeek API key not configured' }), {
      status: 500,
    })
  }

  try {
    // Map model to DeepSeek model
    const deepseekModel = model === 'deepseek-reasoner' || model === 'reasoning' 
      ? 'deepseek-reasoner' 
      : 'deepseek-chat'

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: deepseekModel,
        messages: [
          {
            role: 'system',
            content: ACADEMIC_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: true,
        temperature: 0.3, // Lower temperature for more consistent academic writing
        max_tokens: 12000, // Increased for comprehensive reviews
        top_p: 0.9,
      }),
    })

    if (!response.ok) {
      console.log('[v0] DeepSeek API error:', response.status, response.statusText)
      return response
    }

    // Transform OpenAI-compatible SSE to our format
    const transformedStream = transformOpenAIStream(response.body!)
    return new Response(transformedStream, {
      headers: response.headers,
    })
  } catch (error) {
    console.error('[v0] DeepSeek error:', error)
    return new Response(JSON.stringify({ error: 'DeepSeek request failed' }), {
      status: 500,
    })
  }
}

async function callGroq(prompt: string, model: string): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    console.log('[v0] Groq API key not found')
    return new Response(JSON.stringify({ error: 'Groq API key not configured' }), {
      status: 500,
    })
  }

  try {
    // Use Llama 3.3 70B for all models
    const groqModel = 'llama-3.3-70b-versatile'

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          {
            role: 'system',
            content: ACADEMIC_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: true,
        temperature: 0.3, // Lower temperature for more consistent academic writing
        max_tokens: 8000,
        top_p: 0.9,
      }),
    })

    if (!response.ok) {
      console.log('[v0] Groq API error:', response.status, response.statusText)
      return response
    }

    // Transform OpenAI-compatible SSE to our format
    const transformedStream = transformOpenAIStream(response.body!)
    return new Response(transformedStream, {
      headers: response.headers,
    })
  } catch (error) {
    console.error('[v0] Groq error:', error)
    return new Response(JSON.stringify({ error: 'Groq request failed' }), {
      status: 500,
    })
  }
}

function transformOpenAIStream(stream: ReadableStream): ReadableStream {
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: false })
  const encoder = new TextEncoder()
  let buffer = ''

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            // Process any remaining buffer content
            if (buffer.trim()) {
              const lines = buffer.split('\n')
              for (const line of lines) {
                processLine(line, controller, encoder)
              }
            }
            controller.close()
            break
          }

          // Decode the chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk
          
          // Process complete lines only
          const lines = buffer.split('\n')
          
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || ''

          for (const line of lines) {
            processLine(line, controller, encoder)
          }
        }
      } catch (error) {
        console.error('[v0] Stream error:', error)
        controller.error(error)
      }
    },
  })
}

function processLine(line: string, controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  const trimmedLine = line.trim()
  if (!trimmedLine || !trimmedLine.startsWith('data: ')) return
  
  const data = trimmedLine.slice(6).trim()
  
  if (data === '[DONE]') {
    return
  }

  try {
    const parsed = JSON.parse(data)
    
    // Handle different response formats
    // Standard OpenAI/Groq format
    let content = parsed.choices?.[0]?.delta?.content
    
    // DeepSeek reasoner format - only use reasoning_content if no regular content
    // Note: We skip reasoning_content as it's internal thinking, not the final output
    if (!content && parsed.choices?.[0]?.delta?.reasoning_content) {
      // DeepSeek reasoner sends reasoning first, then content
      // We only want the actual content, not the reasoning process
      return
    }

    if (content) {
      controller.enqueue(encoder.encode(content))
    }
  } catch (e) {
    // Skip invalid JSON - this is normal for SSE streams
  }
}
