import { NextRequest } from 'next/server'

export const runtime = 'edge'

type AIProvider = 'deepseek' | 'groq'

interface GenerateRequest {
  researchQuestion: string
  model: string
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

    const prompt = `Generate a comprehensive literature review on the following research question:

Research Question: ${researchQuestion}

Please provide a well-structured literature review with the following sections:
1. Executive Summary
2. Introduction and Background
3. Key Themes and Findings
4. Methodological Approaches
5. Current Research Gaps
6. Future Research Directions
7. Conclusion

Use proper academic language, include relevant insights, and ensure logical flow between sections. Cite general knowledge where appropriate.`

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
    const deepseekModel = model.includes('reasoning') ? 'deepseek-reasoner' : 'deepseek-chat'

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
            role: 'user',
            content: prompt,
          },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 8000,
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
            role: 'user',
            content: prompt,
          },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 8000,
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
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            controller.close()
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n').filter(line => line.trim() !== '')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              
              if (data === '[DONE]') {
                continue
              }

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content

                if (content) {
                  // Send as simple text chunks
                  controller.enqueue(encoder.encode(content))
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error) {
        console.error('[v0] Stream error:', error)
        controller.error(error)
      }
    },
  })
}
