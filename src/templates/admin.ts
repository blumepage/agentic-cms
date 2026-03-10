import { adminLayout } from './layout'
import type { Project, ProjectFile } from '../types'

export function renderProjectList(projects: (Project & { file_count: number })[]) {
  return adminLayout('Projects \u2014 Agentic CMS', `
    <div class="p-8 max-w-5xl">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-surface-900">Projects</h1>
          <p class="text-sm text-surface-500 mt-1">${projects.length} project${projects.length !== 1 ? 's' : ''}</p>
        </div>
        <a href="/admin/new" class="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium shadow-sm transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          New Project
        </a>
      </div>
      <div class="grid gap-4">
        ${projects.length === 0 ? `
          <div class="bg-white rounded-xl border border-surface-200 shadow-sm text-center py-16 px-6">
            <div class="w-12 h-12 bg-surface-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            </div>
            <h3 class="text-sm font-medium text-surface-900 mb-1">No projects yet</h3>
            <p class="text-sm text-surface-500">Create your first project to get started.</p>
          </div>
        ` : projects.map(p => `
          <a href="/admin/project/${p.slug}" class="block bg-white rounded-xl border border-surface-200 shadow-sm hover:shadow-md hover:border-brand-200 transition-all p-5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-surface-900">${escapeHtml(p.name)}</h3>
                <div class="flex items-center gap-3 mt-1">
                  <span class="text-xs text-surface-400">/s/${p.slug}</span>
                  ${p.custom_domain ? `<span class="text-xs text-brand-600">${escapeHtml(p.custom_domain)}</span>` : ''}
                </div>
              </div>
              <div class="flex items-center gap-4">
                <span class="text-sm font-medium text-surface-700">${p.file_count}</span>
                <span class="text-xs text-surface-400">files</span>
                <svg class="w-4 h-4 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </div>
            </div>
          </a>
        `).join('')}
      </div>
    </div>
  `)
}

export function renderProjectDetail(project: Project, files: ProjectFile[]) {
  return adminLayout(`${project.name} \u2014 Agentic CMS`, `
    <div class="p-8 max-w-5xl">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <a href="/admin" class="text-surface-400 hover:text-surface-600 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </a>
          <div>
            <h1 class="text-xl font-bold text-surface-900">${escapeHtml(project.name)}</h1>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs text-surface-400">/s/${project.slug}</span>
              ${project.custom_domain ? `<span class="text-xs text-brand-600">${escapeHtml(project.custom_domain)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <a href="/s/${project.slug}/" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-2 border border-surface-200 rounded-lg hover:bg-surface-50 text-sm text-surface-600 transition-colors">Preview Site</a>
          <a href="/admin/project/${project.slug}/new" class="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium shadow-sm transition-colors">New File</a>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
        ${files.length === 0 ? `
          <div class="text-center py-12 px-6"><p class="text-sm text-surface-500">No files yet. Create your first file.</p></div>
        ` : `
          <table class="w-full">
            <thead><tr class="border-b border-surface-100">
              <th class="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Path</th>
              <th class="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Type</th>
              <th class="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Dynamic</th>
              <th class="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Updated</th>
            </tr></thead>
            <tbody class="divide-y divide-surface-100">
              ${files.map(f => `
                <tr class="hover:bg-surface-50 cursor-pointer transition-colors" onclick="window.location='/admin/project/${project.slug}/edit${f.path}'">
                  <td class="px-6 py-3"><div class="flex items-center gap-2"><span class="text-surface-400">${getFileIcon(f.content_type)}</span><span class="font-medium text-sm text-surface-900">${escapeHtml(f.path)}</span></div></td>
                  <td class="px-6 py-3 text-xs text-surface-500">${f.content_type}</td>
                  <td class="px-6 py-3">${f.is_dynamic ? `<span class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20">API</span>` : ''}</td>
                  <td class="px-6 py-3 text-sm text-surface-400">${formatDate(f.updated_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
      <div class="bg-white rounded-xl border border-surface-200 shadow-sm mt-6 p-6">
        <h3 class="text-sm font-semibold text-surface-900 mb-3">Project Settings</h3>
        <form hx-put="/api/projects/${project.slug}" hx-target="#settings-status" hx-swap="innerHTML" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-surface-700 mb-1.5">Name</label>
              <input name="name" value="${escapeHtml(project.name)}" class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-medium text-surface-700 mb-1.5">Custom Domain</label>
              <input name="custom_domain" value="${escapeHtml(project.custom_domain || '')}" placeholder="example.com" class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all" />
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button type="submit" class="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium shadow-sm transition-colors">Save Settings</button>
            <span id="settings-status" class="text-sm text-surface-500"></span>
          </div>
        </form>
      </div>
    </div>
  `)
}

export function renderFileEditor(project: Project, file: ProjectFile) {
  return `
    <div class="animate-fade-in" id="editor">
      <div class="p-8 max-w-5xl">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <a href="/admin/project/${project.slug}" class="text-surface-400 hover:text-surface-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </a>
            <div>
              <h2 class="text-xl font-bold text-surface-900">${escapeHtml(file.path)}</h2>
              <span class="text-xs text-surface-400">${project.name} &bull; ${file.content_type}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span id="save-status" class="text-sm text-surface-500"></span>
            <a href="/s/${project.slug}${file.path}" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-2 border border-surface-200 rounded-lg hover:bg-surface-50 text-sm text-surface-600 transition-colors">Preview</a>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 shadow-sm">
          <form id="edit-form">
            <div class="p-6 space-y-5">
              <div class="flex items-center gap-4">
                <div class="flex-1">
                  <label class="block text-sm font-medium text-surface-700 mb-1.5">Content Type</label>
                  <input name="content_type" value="${escapeHtml(file.content_type)}" class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all" />
                </div>
                <div class="flex items-center gap-2 pt-6">
                  <label class="text-sm font-medium text-surface-700">Dynamic (API)</label>
                  <input type="checkbox" name="is_dynamic" value="true" ${file.is_dynamic ? 'checked' : ''} class="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-surface-700 mb-1.5">Content</label>
                <textarea name="content" rows="22" class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-y">${escapeHtml(file.content)}</textarea>
              </div>
            </div>
            <div class="flex items-center justify-between px-6 py-4 bg-surface-50 border-t border-surface-100 rounded-b-xl">
              <div class="flex items-center gap-2">
                ${file.is_dynamic ? `<span class="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20">API Route</span>` : `<span class="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-surface-100 text-surface-600">Static</span>`}
                <span class="text-xs text-surface-400">Updated by ${escapeHtml(file.updated_by)}</span>
              </div>
              <button type="button" hx-put="/api/projects/${project.slug}/files${file.path}" hx-include="#edit-form" hx-target="#save-status"
                      hx-vals='js:{"content": document.querySelector("[name=content]").value, "content_type": document.querySelector("[name=content_type]").value, "is_dynamic": document.querySelector("[name=is_dynamic]")?.checked ? "true" : "false", "author": "human"}'
                      class="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium shadow-sm transition-colors">Save</button>
            </div>
          </form>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 shadow-sm mt-6">
          <div class="px-6 py-4 border-b border-surface-100 flex items-center gap-2">
            <div class="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center">
              <svg class="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h3 class="text-sm font-semibold text-surface-900">AI Agent</h3>
          </div>
          <div class="p-6">
            <div class="flex gap-2">
              <input name="instruction" placeholder="e.g. Add a hero section with gradient background..." class="flex-1 border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" id="agent-instruction" />
              <button type="button" hx-post="/api/agent/edit"
                      hx-vals='js:{"project": "${project.slug}", "path": "${file.path}", "instruction": document.getElementById("agent-instruction").value}'
                      hx-target="#agent-result" hx-indicator="#agent-spinner"
                      class="inline-flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium shadow-sm transition-colors whitespace-nowrap">Run Agent</button>
            </div>
            <div id="agent-spinner" class="htmx-indicator flex items-center gap-2 mt-3 text-sm text-purple-600">Agent is working...</div>
            <div id="agent-result" class="mt-3 text-sm"></div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 shadow-sm mt-6 mb-8">
          <div class="px-6 py-4 border-b border-surface-100"><h3 class="text-sm font-semibold text-surface-900">Version History</h3></div>
          <div hx-get="/api/projects/${project.slug}/files${file.path}/versions" hx-trigger="load" hx-target="#versions-list" id="versions-list" class="p-6 text-sm text-surface-500">Loading versions...</div>
        </div>
      </div>
    </div>
  `
}

export function renderNewProjectForm() {
  return adminLayout('New Project \u2014 Agentic CMS', `
    <div class="animate-fade-in" id="editor">
      <div class="p-8 max-w-3xl">
        <div class="flex items-center gap-3 mb-6">
          <a href="/admin" class="text-surface-400 hover:text-surface-600 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </a>
          <h2 class="text-xl font-bold text-surface-900">Create New Project</h2>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 shadow-sm">
          <form id="new-project-form">
            <div class="p-6 space-y-5">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-surface-700 mb-1.5">Project Name</label>
                  <input name="name" placeholder="My Landing Page" class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all" required />
                </div>
                <div>
                  <label class="block text-sm font-medium text-surface-700 mb-1.5">Slug</label>
                  <input name="slug" placeholder="my-landing-page" class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all" required />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-surface-700 mb-1.5">Custom Domain (optional)</label>
                <input name="custom_domain" placeholder="example.com" class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all" />
              </div>
            </div>
            <div class="flex justify-end px-6 py-4 bg-surface-50 border-t border-surface-100 rounded-b-xl">
              <button type="button" hx-post="/api/projects" hx-include="#new-project-form" hx-target="body" hx-swap="innerHTML"
                      hx-on::after-request="if(event.detail.successful) window.location='/admin'"
                      class="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium shadow-sm transition-colors">Create Project</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `)
}

export function renderNewFileForm(projectSlug: string) {
  return adminLayout('New File \u2014 Agentic CMS', `
    <div class="animate-fade-in" id="editor">
      <div class="p-8 max-w-3xl">
        <div class="flex items-center gap-3 mb-6">
          <a href="/admin/project/${projectSlug}" class="text-surface-400 hover:text-surface-600 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </a>
          <h2 class="text-xl font-bold text-surface-900">New File</h2>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 shadow-sm">
          <form id="new-file-form">
            <div class="p-6 space-y-5">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-surface-700 mb-1.5">File Path</label>
                  <input name="path" placeholder="/about.html" class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all" required />
                </div>
                <div>
                  <label class="block text-sm font-medium text-surface-700 mb-1.5">Content Type</label>
                  <select name="content_type" class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all">
                    <option value="text/html">HTML</option>
                    <option value="text/css">CSS</option>
                    <option value="application/javascript">JavaScript</option>
                    <option value="application/json">JSON</option>
                    <option value="text/plain">Plain Text</option>
                  </select>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" name="is_dynamic" value="true" id="is-dynamic" class="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                <label for="is-dynamic" class="text-sm font-medium text-surface-700">Dynamic (API Route)</label>
              </div>
              <div>
                <label class="block text-sm font-medium text-surface-700 mb-1.5">Content</label>
                <textarea name="content" rows="12" placeholder="<h1>Hello World</h1>" class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-y"></textarea>
              </div>
            </div>
            <div class="flex justify-end px-6 py-4 bg-surface-50 border-t border-surface-100 rounded-b-xl">
              <button type="button" hx-put="/api/projects/${projectSlug}/files/" hx-include="#new-file-form" hx-target="body" hx-swap="innerHTML"
                      hx-on::after-request="if(event.detail.successful) window.location='/admin/project/${projectSlug}'"
                      class="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium shadow-sm transition-colors">Create File</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `)
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getFileIcon(contentType: string): string {
  if (contentType.includes('html')) return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>'
  if (contentType.includes('css')) return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z"/></svg>'
  if (contentType.includes('javascript')) return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>'
  if (contentType.includes('json')) return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z"/></svg>'
  return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'
}
