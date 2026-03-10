import { Hono } from 'hono'
import type { HonoEnv } from '../types'
import { purgePageCache } from '../middleware/cache'
import { gitSyncPage } from '../lib/git-sync'

const api = new Hono<HonoEnv>()

// Helper to parse body from either JSON or form data
async function parseBody(c: { req: { header: (name: string) => string | undefined; json: () => Promise<Record<string, unknown>>; parseBody: () => Promise<Record<string, unknown>> } }): Promise<Record<string, unknown>> {
  const contentType = c.req.header('content-type') || ''
  if (contentType.includes('application/json')) {
    return await c.req.json()
  }
  return await c.req.parseBody() as Record<string, unknown>
}

// List all pages
api.get('/pages', async (c) => {
  const sql = c.get('sql')
  const pages = await sql`
    SELECT id, slug, title, status, updated_at, updated_by
    FROM pages ORDER BY updated_at DESC
  `
  return c.json(pages)
})

// Create a new page
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

// Get current page content
api.get('/pages/:slug', async (c) => {
  const sql = c.get('sql')
  const result = await sql`SELECT * FROM pages WHERE slug = ${c.req.param('slug')}`
  const page = result[0]
  if (!page) return c.json({ error: 'not found' }, 404)
  return c.json(page)
})

// Update page content (agent writes here)
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

  // Purge edge cache
  try {
    await purgePageCache(slug, c.env.BASE_URL)
  } catch {
    // Cache purge is best-effort
  }

  // Trigger async git sync (fire and forget)
  if (c.env.GITHUB_TOKEN && c.env.GITHUB_REPO) {
    c.executionCtx?.waitUntil?.(
      gitSyncPage(slug, updated as Record<string, unknown>, c.env).catch(() => {})
    )
  }

  return c.json(updated)
})

// List all page versions
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

// Rollback to a specific version
api.post('/pages/:slug/rollback/:version', async (c) => {
  const sql = c.get('sql')
  const slug = c.req.param('slug')
  const version = parseInt(c.req.param('version'))

  const vResult = await sql`
    SELECT v.content, v.title, v.meta FROM page_versions v
    JOIN pages p ON p.id = v.page_id
    WHERE p.slug = ${slug} AND v.version = ${version}
  `
  const v = vResult[0]
  if (!v) return c.json({ error: 'version not found' }, 404)

  const result = await sql`
    UPDATE pages
    SET content = ${v.content}, title = ${v.title}, meta = ${v.meta}::jsonb,
        updated_by = 'rollback', updated_at = now()
    WHERE slug = ${slug}
    RETURNING *
  `
  const updated = result[0]
  return c.json(updated)
})

// Publish
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

// Unpublish (set to draft)
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

// Trigger agent edit
api.post('/agent/edit', async (c) => {
  const body = await parseBody(c)
  const slug = body.slug as string
  const instruction = body.instruction as string
  const maxIterations = body.maxIterations as number | undefined

  if (!slug || !instruction) {
    return c.json({ error: 'slug and instruction are required' }, 400)
  }

  // Create a Durable Object instance for this session
  const id = c.env.AGENT_SESSION.newUniqueId()
  const stub = c.env.AGENT_SESSION.get(id)

  const result = await stub.fetch(new Request('https://dummy/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug,
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

// Components CRUD
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

export { api }
