import { Hono } from 'hono'
import { layout } from '../templates/layout'
import type { HonoEnv } from '../types'

const pages = new Hono<HonoEnv>()

// Serve a published page
pages.get('/:slug', async (c) => {
  const sql = c.get('sql')
  const slug = c.req.param('slug')

  const result = await sql`
    SELECT title, content, meta FROM pages
    WHERE slug = ${slug} AND status = 'published'
  `
  const page = result[0]
  if (!page) return c.notFound()

  const meta = (page.meta || {}) as Record<string, string>
  return c.html(layout(page.title as string, page.content as string, meta))
})

// HTMX fragment endpoint — returns just the component HTML, no layout wrapper
pages.get('/fragment/:name', async (c) => {
  const sql = c.get('sql')
  const result = await sql`
    SELECT html FROM components WHERE name = ${c.req.param('name')}
  `
  const component = result[0]
  if (!component) return c.notFound()
  return c.html(component.html as string)
})

export { pages }
