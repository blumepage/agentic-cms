import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { httpValidate } from './validate'
import { purgeFileCache, purgePageCache } from '../middleware/cache'
import { gitSyncFile, gitSyncAsPR } from '../lib/git-sync'

interface AgentRequest {
  projectSlug: string
  filePath: string
  instruction: string
  maxIterations: number
  env: {
    DATABASE_URL: string
    CLAUDE_API_KEY: string
    BASE_URL: string
    GITHUB_TOKEN: string
    GITHUB_REPO: string
  }
}

interface SessionStatus {
  sessionId?: string
  status: string
  iterations?: number
  phase?: string
  error?: string
}

export class AgentSession {
  state: DurableObjectState

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'GET') {
      const status = await this.state.storage.get<SessionStatus>('status')
      return Response.json(status || { status: 'unknown' })
    }

    const { projectSlug, filePath, instruction, maxIterations = 5, env } = await request.json() as AgentRequest
    const sql = neon(env.DATABASE_URL)
    const sessionId = crypto.randomUUID()

    await this.state.storage.put('status', {
      sessionId,
      status: 'running',
      iterations: 0
    } satisfies SessionStatus)

    try {
      const result = await this.editLoop(sql, projectSlug, filePath, instruction, maxIterations, env)
      await this.state.storage.put('status', {
        sessionId,
        status: result.success ? 'completed' : 'needs_review',
        iterations: result.iterations
      } satisfies SessionStatus)
      return Response.json(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await this.state.storage.put('status', {
        sessionId,
        status: 'failed',
        error: message
      } satisfies SessionStatus)
      return Response.json({ success: false, error: message }, { status: 500 })
    }
  }

  async editLoop(
    sql: NeonQueryFunction<false, false>,
    projectSlug: string,
    filePath: string,
    instruction: string,
    maxIterations: number,
    env: AgentRequest['env']
  ) {
    // Look up the file
    const fileResult = await sql`
      SELECT f.* FROM files f
      JOIN projects p ON p.id = f.project_id
      WHERE p.slug = ${projectSlug} AND f.path = ${filePath}
    `
    const currentFile = fileResult[0]
    if (!currentFile) {
      throw new Error(`File not found: ${projectSlug}:${filePath}`)
    }

    let content = currentFile.content as string
    const contentType = currentFile.content_type as string
    let validationIssues: string[] = []

    for (let i = 0; i < maxIterations; i++) {
      await this.state.storage.put('status', {
        status: 'running',
        iterations: i + 1,
        phase: 'generating'
      } satisfies SessionStatus)

      // Build system prompt based on content type
      const isHtml = contentType.includes('html')
      const systemPrompt = isHtml
        ? `You are editing an HTMX + Alpine.js page served via Tailwind CDN. Return ONLY the updated HTML content — no markdown fences, no explanation. The HTML can use:
- HTMX attributes (hx-get, hx-post, hx-swap, hx-trigger, etc.)
- Alpine.js directives (x-data, x-show, x-on, x-text, etc.)
- Tailwind CSS classes
The HTML will be injected into a <body> tag that already loads HTMX, Alpine, and Tailwind.`
        : `You are editing a ${contentType} file. Return ONLY the updated file content — no markdown fences, no explanation.`

      // Generate updated content via Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.CLAUDE_API_KEY,
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: `Current content:\n${content}\n\nInstruction: ${instruction}${
              validationIssues.length > 0
                ? `\n\nPrevious attempt had issues:\n${validationIssues.map(issue => `- ${issue}`).join('\n')}`
                : ''
            }`
          }]
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Claude API error: ${response.status} ${errText}`)
      }

      const data = await response.json() as { content: Array<{ text: string }> }
      const newContent = data.content[0].text

      // Write to DB — file is live instantly
      await sql`
        UPDATE files SET content = ${newContent}, updated_by = 'ai-agent', updated_at = now()
        WHERE id = ${currentFile.id}
      `
      content = newContent

      // Purge edge cache
      try {
        await purgeFileCache(projectSlug, filePath, env.BASE_URL)
      } catch {
        // best-effort
      }

      // Validate (only for HTML files)
      if (isHtml) {
        await this.state.storage.put('status', {
          status: 'running',
          iterations: i + 1,
          phase: 'validating'
        } satisfies SessionStatus)

        validationIssues = await httpValidate(`${projectSlug}${filePath}`, env.BASE_URL)

        if (validationIssues.length === 0) {
          // Trigger async git sync
          if (env.GITHUB_TOKEN && env.GITHUB_REPO) {
            try {
              await gitSyncFile(projectSlug, filePath, { ...currentFile, content, updated_by: 'ai-agent' }, {
                GITHUB_TOKEN: env.GITHUB_TOKEN,
                GITHUB_REPO: env.GITHUB_REPO,
              })
            } catch {
              // git sync is best-effort
            }
          }
          return { success: true, iterations: i + 1, content }
        }

        // Feed issues back as next instruction
        instruction = `Fix these issues:\n${validationIssues.map(issue => `- ${issue}`).join('\n')}`
      } else {
        // Non-HTML files: no validation, just sync and return
        if (env.GITHUB_TOKEN && env.GITHUB_REPO) {
          try {
            await gitSyncFile(projectSlug, filePath, { ...currentFile, content, updated_by: 'ai-agent' }, {
              GITHUB_TOKEN: env.GITHUB_TOKEN,
              GITHUB_REPO: env.GITHUB_REPO,
            })
          } catch {
            // git sync is best-effort
          }
        }
        return { success: true, iterations: 1, content }
      }
    }

    return {
      success: false,
      iterations: maxIterations,
      content,
      issues: validationIssues
    }
  }
}
