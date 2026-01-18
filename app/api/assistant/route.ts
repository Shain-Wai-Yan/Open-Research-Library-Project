import { NextRequest } from 'next/server'

export const runtime = 'edge'

interface AssistantRequest {
  message: string
  model: string
  history?: Array<{ role: string; content: string }>
}

const SYSTEM_PROMPT = `You are an expert academic research assistant for the Open Research Library platform. Your role is to help researchers with:

1. Understanding and analyzing research papers
2. Explaining research methodologies and approaches
3. Identifying research gaps and opportunities
4. Providing guidance on literature reviews
5. Clarifying academic concepts and terminology
6. Helping synthesize information across sources

Guidelines:
- Provide clear, accurate, and academically rigorous responses
- Use proper academic language while remaining accessible
- Cite general knowledge and well-known research when relevant
- Structure responses clearly with proper formatting
- Be helpful and supportive of the research process
- If you're uncertain about something, acknowledge it
- Offer to elaborate or clarify when discussing complex topics`

export async function POST(req: NextRequest) {
  try {
    const { message, model, history = [] }: AssistantRequest = await req.json()

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Build conversation history
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    // Try DeepSeek first
    let response = await callDeepSeek(messages, model)
    
    // Fallback to Groq if DeepSeek fails
    if (!response.ok) {
      console.log('[v0] DeepSeek failed for assistant, falling back to Groq')
      response = await callGroq(messages)
    }

    if (!response.ok) {
      const errorData = await response.json()
      return new Response(
        JSON.stringify({ 
          error: errorData.error?.message || 'Failed to get response from AI' 
        }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('[v0] Assistant API Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

async function callDeepSeek(
  messages: Array<{ role: string; content: string }>,
  model: string
): Promise<Response> {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'DeepSeek API key not configured' }), {
      status: 500,
    })
  }

  try {
    const deepseekModel = model === 'deepseek-reasoner' ? 'deepseek-reasoner' : 'deepseek-chat'

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: deepseekModel,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      return response
    }

    const transformedStream = transformStream(response.body!)
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

async function callGroq(
  messages: Array<{ role: string; content: string }>
): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Groq API key not configured' }), {
      status: 500,
    })
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      return response
    }

    const transformedStream = transformStream(response.body!)
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

function transformStream(stream: ReadableStream): ReadableStream {
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
            // Process any remaining buffer
            if (buffer.trim()) {
              const lines = buffer.split('\n')
              for (const line of lines) {
                processSSELine(line, controller, encoder)
              }
            }
            controller.close()
            break
          }

          // Decode chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk
          
          // Process complete lines
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            processSSELine(line, controller, encoder)
          }
        }
      } catch (error) {
        console.error('[v0] Stream error:', error)
        controller.error(error)
      }
    },
  })
}

function processSSELine(
  line: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const trimmedLine = line.trim()
  if (!trimmedLine || !trimmedLine.startsWith('data: ')) return
  
  const data = trimmedLine.slice(6).trim()
  if (data === '[DONE]') return

  try {
    const parsed = JSON.parse(data)
    
    // Only use content, not reasoning_content (which is internal thinking)
    const content = parsed.choices?.[0]?.delta?.content
    
    if (content) {
      controller.enqueue(encoder.encode(content))
    }
  } catch (e) {
    // Skip invalid JSON - normal for SSE
  }
}
