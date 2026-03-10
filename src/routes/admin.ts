import { Hono } from 'hono'
import type { HonoEnv, Project, ProjectFile } from '../types'
import { renderProjectList, renderProjectDetail, renderFileEditor, renderNewProjectForm, renderNewFileForm } from '../templates/admin'

const admin = new Hono<HonoEnv>()

// Project list
admin.get('/', async (c) => {
  const sql = c.get('sql')
  const projects = await sql`
    SELECT p.*, (SELECT count(*) FROM files f WHERE f.project_id = p.id) as file_count
    FROM projects p ORDER BY p.updated_at DESC
  `
  return c.html(renderProjectList(projects as unknown as (Project & { file_count: number })[]))
})

// New project form
admin.get('/new', async (c) => {
  return c.html(renderNewProjectForm())
})

// Handle project creation (redirect after)
admin.post('/new', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.parseBody()
  if (!body.name || !body.slug) {
    return c.html(renderNewProjectForm())
  }
  const result = await sql`
    INSERT INTO projects (name, slug, custom_domain, settings)
    VALUES (${body.name as string}, ${body.slug as string}, ${(body.custom_domain as string) || null}, '{}'::jsonb)
    RETURNING *
  `
  const created = result[0]
  if (!created) return c.html(renderNewProjectForm())
  // Auto-create index.html
  await sql`
    INSERT INTO files (project_id, path, content, content_type, updated_by)
    VALUES (${created.id}, '/index.html', '<h1>Welcome</h1><p>Edit this page to get started.</p>', 'text/html', 'system')
  `
  return c.redirect(`/admin/project/${body.slug as string}`)
})

// Project detail (file browser)
admin.get('/project/:slug', async (c) => {
  const sql = c.get('sql')
  const projectSlug = c.req.param('slug')

  const projectResult = await sql`SELECT * FROM projects WHERE slug = ${projectSlug}`
  const project = projectResult[0]
  if (!project) return c.notFound()

  const files = await sql`
    SELECT * FROM files WHERE project_id = ${project.id} ORDER BY path
  `

  return c.html(renderProjectDetail(
    project as unknown as Project,
    files as unknown as ProjectFile[]
  ))
})

// New file form
admin.get('/project/:slug/new', async (c) => {
  const projectSlug = c.req.param('slug')
  return c.html(renderNewFileForm(projectSlug))
})

// Handle file creation (redirect after)
admin.post('/project/:slug/new', async (c) => {
  const sql = c.get('sql')
  const projectSlug = c.req.param('slug')
  const body = await c.req.parseBody()

  const projectResult = await sql`SELECT id FROM projects WHERE slug = ${projectSlug}`
  const project = projectResult[0]
  if (!project) return c.notFound()

  let filePath = (body.path as string) || '/'
  if (!filePath.startsWith('/')) filePath = '/' + filePath

  const contentType = (body.content_type as string) || 'text/html'
  const isDynamic = body.is_dynamic === 'true' || filePath.startsWith('/api/')

  await sql`
    INSERT INTO files (project_id, path, content, content_type, is_dynamic, updated_by)
    VALUES (${project.id}, ${filePath}, ${(body.content as string) || ''}, ${contentType}, ${isDynamic}, 'human')
    ON CONFLICT (project_id, path) DO UPDATE
    SET content = ${(body.content as string) || ''},
        content_type = ${contentType},
        is_dynamic = ${isDynamic},
        updated_by = 'human',
        updated_at = now()
  `
  return c.redirect(`/admin/project/${projectSlug}`)
})

// File editor
admin.get('/project/:slug/edit/*', async (c) => {
  const sql = c.get('sql')
  const projectSlug = c.req.param('slug')

  const url = new URL(c.req.url)
  const prefix = `/admin/project/${projectSlug}/edit`
  let filePath = url.pathname.slice(prefix.length) || '/'
  if (!filePath.startsWith('/')) filePath = '/' + filePath

  const projectResult = await sql`SELECT * FROM projects WHERE slug = ${projectSlug}`
  const project = projectResult[0]
  if (!project) return c.notFound()

  const fileResult = await sql`
    SELECT * FROM files WHERE project_id = ${project.id} AND path = ${filePath}
  `
  const file = fileResult[0]
  if (!file) return c.notFound()

  return c.html(renderFileEditor(
    project as unknown as Project,
    file as unknown as ProjectFile
  ))
})

export { admin }
