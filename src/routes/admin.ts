import { Hono } from 'hono'
import type { HonoEnv, Page } from '../types'
import { renderAdminList, renderEditor, renderNewPageForm } from '../templates/admin'

const admin = new Hono<HonoEnv>()

// Admin page list
admin.get('/', async (c) => {
  const sql = c.get('sql')
  const pages = await sql`
    SELECT slug, title, status, updated_at, updated_by
    FROM pages ORDER BY updated_at DESC
  `
  return c.html(renderAdminList(pages as unknown as Page[]))
})

// New page form
admin.get('/new', async (c) => {
  return c.html(renderNewPageForm())
})

// Edit page
admin.get('/edit/:slug', async (c) => {
  const sql = c.get('sql')
  const result = await sql`SELECT * FROM pages WHERE slug = ${c.req.param('slug')}`
  const page = result[0]
  if (!page) return c.notFound()
  return c.html(renderEditor(page as unknown as Page))
})

export { admin }
