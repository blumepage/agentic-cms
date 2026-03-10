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
