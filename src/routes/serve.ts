import { Hono } from 'hono'
import { layout } from '../templates/layout'
import type { HonoEnv } from '../types'

const serve = new Hono<HonoEnv>()

// Serve project files at /s/:projectSlug/*
serve.get('/:projectSlug/*', async (c) => {
  const sql = c.get('sql')
  const projectSlug = c.req.param('projectSlug')

  // Extract file path from URL
  const url = new URL(c.req.url)
  const prefix = `/s/${projectSlug}`
  let filePath = url.pathname.slice(prefix.length) || '/'

  // Auto-resolve / to /index.html
  if (filePath === '/' || filePath === '') {
    filePath = '/index.html'
  }

  // Look up the file
  const result = await sql`
    SELECT f.* FROM files f
    JOIN projects p ON p.id = f.project_id
    WHERE p.slug = ${projectSlug} AND f.path = ${filePath}
  `
  let file = result[0]

  // Try with .html extension if not found
  if (!file && !filePath.includes('.')) {
    const htmlResult = await sql`
      SELECT f.* FROM files f
      JOIN projects p ON p.id = f.project_id
      WHERE p.slug = ${projectSlug} AND f.path = ${filePath + '.html'}
    `
    file = htmlResult[0]
  }

  if (!file) return c.notFound()

  // Handle dynamic files (API routes)
  if (file.is_dynamic) {
    return handleDynamicFile(c, file as Record<string, unknown>)
  }

  const contentType = file.content_type as string

  // For HTML files, wrap in layout with Tailwind/HTMX/Alpine
  if (contentType === 'text/html') {
    const title = (file.meta as Record<string, string>)?.title || 'Page'
    const meta = (file.meta as Record<string, string>) || {}
    return c.html(layout(title, file.content as string, meta))
  }

  // For non-HTML files, serve raw with correct content type
  return new Response(file.content as string, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=10',
    }
  })
})

// Serve project files at root via custom domain
serve.get('/*', async (c) => {
  const sql = c.get('sql')
  const host = c.req.header('host') || ''

  // Skip if not a custom domain request (handled by other routes)
  if (!host || host.includes('workers.dev')) {
    return c.notFound()
  }

  let filePath = new URL(c.req.url).pathname
  if (filePath === '/' || filePath === '') {
    filePath = '/index.html'
  }

  // Look up project by custom domain
  const result = await sql`
    SELECT f.* FROM files f
    JOIN projects p ON p.id = f.project_id
    WHERE p.custom_domain = ${host} AND f.path = ${filePath}
  `
  let file = result[0]

  // Try with .html extension
  if (!file && !filePath.includes('.')) {
    const htmlResult = await sql`
      SELECT f.* FROM files f
      JOIN projects p ON p.id = f.project_id
      WHERE p.custom_domain = ${host} AND f.path = ${filePath + '.html'}
    `
    file = htmlResult[0]
  }

  if (!file) return c.notFound()

  if (file.is_dynamic) {
    return handleDynamicFile(c, file as Record<string, unknown>)
  }

  const contentType = file.content_type as string
  if (contentType === 'text/html') {
    const title = (file.meta as Record<string, string>)?.title || 'Page'
    const meta = (file.meta as Record<string, string>) || {}
    return c.html(layout(title, file.content as string, meta))
  }

  return new Response(file.content as string, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=10',
    }
  })
})

// Handle dynamic (serverless) file execution
function handleDynamicFile(c: { req: { method: string; url: string; header: (name: string) => string | undefined }; json: (data: unknown, status?: number) => Response }, file: Record<string, unknown>): Response {
  try {
    const config = JSON.parse(file.content as string) as {
      method?: string
      handler: string
      response?: unknown
      redirect?: string
      status?: number
      headers?: Record<string, string>
    }

    // Check method
    if (config.method && config.method.toUpperCase() !== c.req.method) {
      return c.json({ error: 'Method not allowed' }, 405)
    }

    switch (config.handler) {
      case 'json':
        return c.json(processTemplate(config.response || {}) as Record<string, unknown>)

      case 'redirect':
        return new Response(null, {
          status: config.status || 302,
          headers: { Location: config.redirect || '/' }
        })

      default:
        return c.json(config.response || { ok: true })
    }
  } catch {
    return c.json({ error: 'Invalid dynamic file configuration' }, 500)
  }
}

// Simple template processing for dynamic responses
function processTemplate(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj
      .replace(/\{\{now\}\}/g, new Date().toISOString())
      .replace(/\{\{timestamp\}\}/g, String(Date.now()))
  }
  if (Array.isArray(obj)) return obj.map(processTemplate)
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = processTemplate(value)
    }
    return result
  }
  return obj
}

export { serve }
