import { Hono } from 'hono'
import type { HonoEnv } from '../types'
import { purgeFileCache } from '../middleware/cache'
import { gitSyncFile } from '../lib/git-sync'

const api = new Hono<HonoEnv>()

// Helper to parse body from either JSON or form data
async function parseBody(c: { req: { header: (name: string) => string | undefined; json: () => Promise<Record<string, unknown>>; parseBody: () => Promise<Record<string, unknown>> } }): Promise<Record<string, unknown>> {
  const contentType = c.req.header('content-type') || ''
  if (contentType.includes('application/json')) {
    return await c.req.json()
  }
  return await c.req.parseBody() as Record<string, unknown>
}

// ─── Projects ───────────────────────────────────────────

// List all projects
api.get('/projects', async (c) => {
  const sql = c.get('sql')
  const projects = await sql`
    SELECT p.*, (SELECT count(*) FROM files f WHERE f.project_id = p.id) as file_count
    FROM projects p ORDER BY p.updated_at DESC
  `
  return c.json(projects)
})

// Create a project
api.post('/projects', async (c) => {
  const sql = c.get('sql')
  const body = await parseBody(c)

  if (!body.name || !body.slug) {
    return c.json({ error: 'name and slug are required' }, 400)
  }

  const result = await sql`
    INSERT INTO projects (name, slug, custom_domain, settings)
    VALUES (${body.name as string}, ${body.slug as string}, ${(body.custom_domain as string) || null}, ${JSON.stringify(body.settings || {})}::jsonb)
    RETURNING *
  `
  const created = result[0]
  if (!created) return c.json({ error: 'failed to create project' }, 500)

  // Auto-create index.html for new projects
  await sql`
    INSERT INTO files (project_id, path, content, content_type, updated_by)
    VALUES (${created.id}, '/index.html', '<h1>Welcome</h1><p>Edit this page to get started.</p>', 'text/html', 'system')
  `

  return c.json(created, 201)
})

// Get a project
api.get('/projects/:slug', async (c) => {
  const sql = c.get('sql')
  const result = await sql`SELECT * FROM projects WHERE slug = ${c.req.param('slug')}`
  const project = result[0]
  if (!project) return c.json({ error: 'not found' }, 404)
  return c.json(project)
})

// Update a project
api.put('/projects/:slug', async (c) => {
  const sql = c.get('sql')
  const body = await parseBody(c)
  const slug = c.req.param('slug')

  const result = await sql`
    UPDATE projects
    SET name = COALESCE(${(body.name as string) || null}, name),
        custom_domain = COALESCE(${(body.custom_domain as string) || null}, custom_domain),
        settings = COALESCE(${body.settings ? JSON.stringify(body.settings) : null}::jsonb, settings),
        updated_at = now()
    WHERE slug = ${slug}
    RETURNING *
  `
  const updated = result[0]
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})

// Delete a project
api.delete('/projects/:slug', async (c) => {
  const sql = c.get('sql')
  const result = await sql`DELETE FROM projects WHERE slug = ${c.req.param('slug')} RETURNING id`
  if (result.length === 0) return c.json({ error: 'not found' }, 404)
  return c.json({ deleted: true })
})

// ─── Files ──────────────────────────────────────────────

// List files in a project
api.get('/projects/:slug/files', async (c) => {
  const sql = c.get('sql')
  const projectSlug = c.req.param('slug')

  const files = await sql`
    SELECT f.id, f.path, f.content_type, f.is_dynamic, f.meta, f.updated_at, f.updated_by
    FROM files f
    JOIN projects p ON p.id = f.project_id
    WHERE p.slug = ${projectSlug}
    ORDER BY f.path
  `
  return c.json(files)
})

// Create or update a file
api.put('/projects/:slug/files/*', async (c) => {
  const sql = c.get('sql')
  const projectSlug = c.req.param('slug')
  const body = await parseBody(c)

  // Extract file path from URL: /api/projects/:slug/files/path/to/file
  const url = new URL(c.req.url)
  const prefix = `/api/projects/${projectSlug}/files`
  let filePath = url.pathname.slice(prefix.length) || '/'
  // Also allow path in body (for form submissions)
  if (body.path) filePath = body.path as string
  if (!filePath.startsWith('/')) filePath = '/' + filePath

  // Determine content type
  const contentType = (body.content_type as string) || guessContentType(filePath)
  const isDynamic = body.is_dynamic === true || body.is_dynamic === 'true' || filePath.startsWith('/api/')

  const projectResult = await sql`SELECT id FROM projects WHERE slug = ${projectSlug}`
  const project = projectResult[0]
  if (!project) return c.json({ error: 'project not found' }, 404)

  const result = await sql`
    INSERT INTO files (project_id, path, content, content_type, is_dynamic, meta, updated_by)
    VALUES (${project.id}, ${filePath}, ${(body.content as string) || ''}, ${contentType}, ${isDynamic}, ${JSON.stringify(body.meta || {})}::jsonb, ${(body.author as string) || 'human'})
    ON CONFLICT (project_id, path) DO UPDATE
    SET content = ${(body.content as string) || ''},
        content_type = ${contentType},
        is_dynamic = ${isDynamic},
        meta = COALESCE(${body.meta ? JSON.stringify(body.meta) : null}::jsonb, files.meta),
        updated_by = ${(body.author as string) || 'human'},
        updated_at = now()
    RETURNING *
  `
  const file = result[0]

  // Purge cache
  try {
    await purgeFileCache(projectSlug, filePath, c.env.BASE_URL)
  } catch { /* best-effort */ }

  // Git sync (fire and forget)
  if (c.env.GITHUB_TOKEN && c.env.GITHUB_REPO) {
    c.executionCtx?.waitUntil?.(
      gitSyncFile(projectSlug, filePath, file as Record<string, unknown>, c.env).catch(() => {})
    )
  }

  return c.json(file)
})

// Get a specific file
api.get('/projects/:slug/files/*', async (c) => {
  const sql = c.get('sql')
  const projectSlug = c.req.param('slug')

  const url = new URL(c.req.url)
  const prefix = `/api/projects/${projectSlug}/files`
  let filePath = url.pathname.slice(prefix.length) || '/'
  if (!filePath.startsWith('/')) filePath = '/' + filePath

  const result = await sql`
    SELECT f.* FROM files f
    JOIN projects p ON p.id = f.project_id
    WHERE p.slug = ${projectSlug} AND f.path = ${filePath}
  `
  const file = result[0]
  if (!file) return c.json({ error: 'not found' }, 404)
  return c.json(file)
})

// Delete a file
api.delete('/projects/:slug/files/*', async (c) => {
  const sql = c.get('sql')
  const projectSlug = c.req.param('slug')

  const url = new URL(c.req.url)
  const prefix = `/api/projects/${projectSlug}/files`
  let filePath = url.pathname.slice(prefix.length) || '/'
  if (!filePath.startsWith('/')) filePath = '/' + filePath

  const result = await sql`
    DELETE FROM files f
    USING projects p
    WHERE p.id = f.project_id AND p.slug = ${projectSlug} AND f.path = ${filePath}
    RETURNING f.id
  `
  if (result.length === 0) return c.json({ error: 'not found' }, 404)
  return c.json({ deleted: true })
})

// ─── File Versions ──────────────────────────────────────

api.get('/projects/:slug/files/*/versions', async (c) => {
  const sql = c.get('sql')
  const projectSlug = c.req.param('slug')

  const url = new URL(c.req.url)
  const prefix = `/api/projects/${projectSlug}/files`
  // Remove /versions suffix to get file path
  let filePath = url.pathname.slice(prefix.length).replace(/\/versions$/, '') || '/'
  if (!filePath.startsWith('/')) filePath = '/' + filePath

  const versions = await sql`
    SELECT fv.* FROM file_versions fv
    JOIN files f ON f.id = fv.file_id
    JOIN projects p ON p.id = f.project_id
    WHERE p.slug = ${projectSlug} AND f.path = ${filePath}
    ORDER BY fv.version DESC
    LIMIT 50
  `
  return c.json(versions)
})

// ─── Agent ──────────────────────────────────────────────

api.post('/agent/edit', async (c) => {
  const body = await parseBody(c)
  const projectSlug = body.project as string
  const filePath = body.path as string
  const instruction = body.instruction as string
  const maxIterations = body.maxIterations as number | undefined

  if (!projectSlug || !filePath || !instruction) {
    return c.json({ error: 'project, path, and instruction are required' }, 400)
  }

  const id = c.env.AGENT_SESSION.newUniqueId()
  const stub = c.env.AGENT_SESSION.get(id)

  const result = await stub.fetch(new Request('https://dummy/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectSlug,
      filePath,
      instruction,
      maxIterations: maxIterations || 5,
      env: {
        DATABASE_URL: c.env.DATABASE_URL,
        CLAUDE_API_KEY: c.env.CLAUDE_API_KEY,
        BASE_URL: c.env.BASE_URL,
        GITHUB_TOKEN: c.env.GITHUB_TOKEN,
        GITHUB_REPO: c.env.GITHUB_REPO,
      }
    })
  }))

  return c.json(await result.json())
})

// ─── Components (shared fragments) ─────────────────────

api.get('/components', async (c) => {
  const sql = c.get('sql')
  const components = await sql`SELECT * FROM components ORDER BY name`
  return c.json(components)
})

api.get('/components/:name', async (c) => {
  const sql = c.get('sql')
  const result = await sql`SELECT * FROM components WHERE name = ${c.req.param('name')}`
  const component = result[0]
  if (!component) return c.json({ error: 'not found' }, 404)
  return c.json(component)
})

api.put('/components/:name', async (c) => {
  const sql = c.get('sql')
  const body = await parseBody(c)
  const name = c.req.param('name')

  const result = await sql`
    INSERT INTO components (name, html, props)
    VALUES (${name}, ${body.html as string}, ${JSON.stringify(body.props || {})}::jsonb)
    ON CONFLICT (name) DO UPDATE
    SET html = ${body.html as string},
        props = ${JSON.stringify(body.props || {})}::jsonb,
        updated_at = now()
    RETURNING *
  `
  return c.json(result[0])
})

// ─── Legacy page endpoints (backward compat) ───────────

api.get('/pages', async (c) => {
  const sql = c.get('sql')
  const pages = await sql`
    SELECT id, slug, title, status, updated_at, updated_by
    FROM pages ORDER BY updated_at DESC
  `
  return c.json(pages)
})

api.post('/pages', async (c) => {
  const sql = c.get('sql')
  const body = await parseBody(c)
  if (!body.slug || !body.title) {
    return c.json({ error: 'slug and title are required' }, 400)
  }
  const result = await sql`
    INSERT INTO pages (slug, title, content, meta, updated_by)
    VALUES (${body.slug as string}, ${body.title as string}, ${(body.content as string) || ''}, ${JSON.stringify(body.meta || {})}::jsonb, ${(body.author as string) || 'human'})
    RETURNING *
  `
  const created = result[0]
  if (!created) return c.json({ error: 'failed to create page' }, 500)
  return c.json(created, 201)
})

api.get('/pages/:slug', async (c) => {
  const sql = c.get('sql')
  const result = await sql`SELECT * FROM pages WHERE slug = ${c.req.param('slug')}`
  const page = result[0]
  if (!page) return c.json({ error: 'not found' }, 404)
  return c.json(page)
})

api.put('/pages/:slug', async (c) => {
  const sql = c.get('sql')
  const body = await parseBody(c)
  const slug = c.req.param('slug')
  const metaValue = body.meta
    ? (typeof body.meta === 'string' ? body.meta : JSON.stringify(body.meta))
    : null
  const result = await sql`
    UPDATE pages
    SET content = ${body.content},
        title = COALESCE(${body.title || null}, title),
        meta = COALESCE(${metaValue}::jsonb, meta),
        updated_by = ${body.author || 'ai-agent'},
        updated_at = now()
    WHERE slug = ${slug}
    RETURNING *
  `
  const updated = result[0]
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})

api.get('/pages/:slug/versions', async (c) => {
  const sql = c.get('sql')
  const versions = await sql`
    SELECT v.* FROM page_versions v
    JOIN pages p ON p.id = v.page_id
    WHERE p.slug = ${c.req.param('slug')}
    ORDER BY v.version DESC
    LIMIT 50
  `
  return c.json(versions)
})

api.post('/pages/:slug/publish', async (c) => {
  const sql = c.get('sql')
  const result = await sql`
    UPDATE pages SET status = 'published', updated_at = now()
    WHERE slug = ${c.req.param('slug')}
    RETURNING *
  `
  const page = result[0]
  if (!page) return c.json({ error: 'not found' }, 404)
  return c.json(page)
})

api.post('/pages/:slug/unpublish', async (c) => {
  const sql = c.get('sql')
  const result = await sql`
    UPDATE pages SET status = 'draft', updated_at = now()
    WHERE slug = ${c.req.param('slug')}
    RETURNING *
  `
  const page = result[0]
  if (!page) return c.json({ error: 'not found' }, 404)
  return c.json(page)
})

// ─── Helpers ────────────────────────────────────────────

function guessContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'application/javascript',
    json: 'application/json',
    xml: 'application/xml',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    ico: 'image/x-icon',
    txt: 'text/plain',
    md: 'text/markdown',
  }
  return types[ext || ''] || 'text/plain'
}

export { api }
