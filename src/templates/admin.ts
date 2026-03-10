import { adminLayout } from './layout'
import type { Page } from '../types'

export function renderAdminList(pages: Page[]) {
  return adminLayout('Pages \u2014 Agentic CMS', `
    <div class="p-8 max-w-5xl">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-surface-900">Pages</h1>
          <p class="text-sm text-surface-500 mt-1">${pages.length} page${pages.length !== 1 ? 's' : ''} total</p>
        </div>
        <button hx-get="/admin/new" hx-target="#editor" hx-push-url="true"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium shadow-sm transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          New Page
        </button>
      </div>
      <div class="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
        ${pages.length === 0 ? `
          <div class="text-center py-16 px-6">
            <div class="w-12 h-12 bg-surface-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <h3 class="text-sm font-medium text-surface-900 mb-1">No pages yet</h3>
            <p class="text-sm text-surface-500">Create your first page to get started.</p>
          </div>
        ` : `
          <table class="w-full">
            <thead><tr class="border-b border-surface-100">
              <th class="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Page</th>
              <th class="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Status</th>
              <th class="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">Updated</th>
              <th class="text-left text-xs font-medium text-surface-500 uppercase tracking-wider px-6 py-3">By</th>
            </tr></thead>
            <tbody class="divide-y divide-surface-100">
              ${pages.map(p => `
                <tr class="hover:bg-surface-50 cursor-pointer transition-colors"
                    hx-get="/admin/edit/${p.slug}" hx-target="#editor" hx-push-url="true">
                  <td class="px-6 py-4">
                    <div class="font-medium text-sm text-surface-900">${escapeHtml(p.title)}</div>
                    <div class="text-xs text-surface-400 mt-0.5">/${p.slug}</div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                      p.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                        : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20'
                    }">
                      <span class="w-1.5 h-1.5 rounded-full ${p.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
                      ${p.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-surface-500">${formatDate(p.updated_at)}</td>
                  <td class="px-6 py-4 text-sm text-surface-400">${p.updated_by}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
      <div id="editor" class="mt-8"></div>
    </div>
  `)
}

export function renderEditor(page: Page) {
  return `
    <div class="animate-fade-in" id="editor">
      <div class="p-8 max-w-5xl">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <a href="/admin" class="text-surface-400 hover:text-surface-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </a>
            <div>
              <h2 class="text-xl font-bold text-surface-900">${escapeHtml(page.title)}</h2>
              <span class="text-xs text-surface-400">/${page.slug}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span id="save-status" class="text-sm text-surface-500"></span>
            <a href="/page/${page.slug}" target="_blank"
               class="inline-flex items-center gap-1.5 px-3 py-2 border border-surface-200 rounded-lg hover:bg-surface-50 text-sm text-surface-600 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              Preview
            </a>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 shadow-sm">
          <form id="edit-form">
            <div class="p-6 space-y-5">
              <div>
                <label class="block text-sm font-medium text-surface-700 mb-1.5">Title</label>
                <input name="title" value="${escapeHtml(page.title)}"
                       class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all" />
              </div>
              <div>
                <label class="block text-sm font-medium text-surface-700 mb-1.5">Content (HTML)</label>
                <textarea name="content" rows="18"
                          class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-y">${escapeHtml(page.content)}</textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-surface-700 mb-1.5">SEO Description</label>
                <input name="description" value="${escapeHtml((page.meta as Record<string, string>)?.description || '')}"
                       placeholder="Brief page description for search engines..."
                       class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all" />
              </div>
            </div>
            <div class="flex items-center justify-between px-6 py-4 bg-surface-50 border-t border-surface-100 rounded-b-xl">
              <span class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                page.status === 'published'
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                  : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20'
              }">
                <span class="w-1.5 h-1.5 rounded-full ${page.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
                ${page.status}
              </span>
              <div class="flex gap-2">
                <button type="button"
                        hx-put="/api/pages/${page.slug}"
                        hx-include="#edit-form"
                        hx-target="#save-status"
                        hx-vals='js:{"content": document.querySelector("[name=content]").value, "title": document.querySelector("[name=title]").value, "meta": JSON.stringify({description: document.querySelector("[name=description]").value}), "author": "human"}'
                        class="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium shadow-sm transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  Save
                </button>
                ${page.status !== 'published' ? `
                  <button type="button" hx-post="/api/pages/${page.slug}/publish" hx-target="#save-status"
                          class="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm transition-colors">Publish</button>
                ` : `
                  <button type="button" hx-post="/api/pages/${page.slug}/unpublish" hx-target="#save-status"
                          class="inline-flex items-center gap-1.5 px-4 py-2 border border-surface-200 text-surface-600 rounded-lg hover:bg-surface-50 text-sm font-medium transition-colors">Unpublish</button>
                `}
              </div>
            </div>
          </form>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 shadow-sm mt-6">
          <div class="px-6 py-4 border-b border-surface-100 flex items-center gap-2">
            <div class="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center">
              <svg class="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h3 class="text-sm font-semibold text-surface-900">AI Agent</h3>
            <span class="text-xs text-surface-400">Ask the agent to edit this page</span>
          </div>
          <div class="p-6">
            <div class="flex gap-2">
              <input name="instruction" placeholder="e.g. Redesign the hero section with a gradient background..."
                     class="flex-1 border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all" id="agent-instruction" />
              <button type="button"
                      hx-post="/api/agent/edit"
                      hx-vals='js:{"slug": "${page.slug}", "instruction": document.getElementById("agent-instruction").value}'
                      hx-target="#agent-result"
                      hx-indicator="#agent-spinner"
                      class="inline-flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium shadow-sm transition-colors whitespace-nowrap">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Run Agent
              </button>
            </div>
            <div id="agent-spinner" class="htmx-indicator flex items-center gap-2 mt-3 text-sm text-purple-600">
              <div class="flex gap-1">
                <span class="loading-dot w-1.5 h-1.5 bg-purple-600 rounded-full inline-block"></span>
                <span class="loading-dot w-1.5 h-1.5 bg-purple-600 rounded-full inline-block"></span>
                <span class="loading-dot w-1.5 h-1.5 bg-purple-600 rounded-full inline-block"></span>
              </div>
              Agent is working...
            </div>
            <div id="agent-result" class="mt-3 text-sm"></div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 shadow-sm mt-6 mb-8">
          <div class="px-6 py-4 border-b border-surface-100">
            <h3 class="text-sm font-semibold text-surface-900">Version History</h3>
          </div>
          <div hx-get="/api/pages/${page.slug}/versions" hx-trigger="load" hx-target="#versions-list"
               id="versions-list" class="p-6 text-sm text-surface-500">Loading versions...</div>
        </div>
      </div>
    </div>
  `
}

export function renderNewPageForm() {
  return `
    <div class="animate-fade-in" id="editor">
      <div class="p-8 max-w-3xl">
        <div class="flex items-center gap-3 mb-6">
          <a href="/admin" class="text-surface-400 hover:text-surface-600 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </a>
          <h2 class="text-xl font-bold text-surface-900">Create New Page</h2>
        </div>
        <div class="bg-white rounded-xl border border-surface-200 shadow-sm">
          <form id="new-page-form">
            <div class="p-6 space-y-5">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-surface-700 mb-1.5">Slug</label>
                  <input name="slug" placeholder="my-page"
                         class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all" required />
                </div>
                <div>
                  <label class="block text-sm font-medium text-surface-700 mb-1.5">Title</label>
                  <input name="title" placeholder="Page Title"
                         class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all" required />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-surface-700 mb-1.5">Content (HTML)</label>
                <textarea name="content" rows="12" placeholder="<h1>Hello World</h1>"
                          class="w-full border border-surface-200 rounded-lg px-3.5 py-2.5 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-y"></textarea>
              </div>
            </div>
            <div class="flex justify-end px-6 py-4 bg-surface-50 border-t border-surface-100 rounded-b-xl">
              <button type="button"
                      hx-post="/api/pages"
                      hx-include="#new-page-form"
                      hx-target="#editor"
                      class="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium shadow-sm transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Create Page
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
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
