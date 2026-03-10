import { layout } from './layout'
import type { Page } from '../types'

export function renderAdminList(pages: Page[]) {
  return layout('Admin — Agentic CMS', `
    <div class="max-w-4xl mx-auto p-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Pages</h1>
        <button hx-get="/admin/new" hx-target="#editor" hx-push-url="true"
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
          + New Page
        </button>
      </div>
      <div class="space-y-2" id="page-list">
        ${pages.map(p => `
          <div class="flex items-center justify-between p-4 border rounded cursor-pointer hover:bg-gray-50"
               hx-get="/admin/edit/${p.slug}" hx-target="#editor" hx-push-url="true">
            <div>
              <span class="font-medium">${escapeHtml(p.title)}</span>
              <span class="text-sm text-gray-500 ml-2">/${p.slug}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs px-2 py-1 rounded ${
                p.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }">${p.status}</span>
              <span class="text-xs text-gray-400">${p.updated_by}</span>
            </div>
          </div>
        `).join('')}
        ${pages.length === 0 ? '<p class="text-gray-500 text-center py-8">No pages yet. Create your first page!</p>' : ''}
      </div>
      <div id="editor" class="mt-8"></div>
    </div>
  `)
}

export function renderEditor(page: Page) {
  return `
    <div class="border rounded-lg p-6" id="editor">
      <h2 class="text-xl font-semibold mb-4">Editing: ${escapeHtml(page.title)}</h2>
      <form id="edit-form">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Title</label>
          <input name="title" value="${escapeHtml(page.title)}"
                 class="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Content (HTML)</label>
          <textarea name="content" rows="20"
                    class="w-full border rounded px-3 py-2 font-mono text-sm">${escapeHtml(page.content)}</textarea>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">SEO Description</label>
          <input name="description" value="${escapeHtml((page.meta as Record<string, string>)?.description || '')}"
                 class="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div class="flex items-center justify-between mt-4">
          <span id="save-status" class="text-sm text-gray-500"></span>
          <div class="flex gap-2">
            <a href="/page/${page.slug}" target="_blank"
               class="px-4 py-2 border rounded hover:bg-gray-50 text-sm">Preview</a>
            <button type="button"
                    hx-put="/api/pages/${page.slug}"
                    hx-include="#edit-form"
                    hx-target="#save-status"
                    hx-vals='js:{"content": document.querySelector("[name=content]").value, "title": document.querySelector("[name=title]").value, "meta": JSON.stringify({description: document.querySelector("[name=description]").value}), "author": "human"}'
                    hx-encoding="application/json"
                    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Save</button>
            <button type="button"
                    hx-post="/api/pages/${page.slug}/publish"
                    hx-target="#save-status"
                    class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">Publish</button>
          </div>
        </div>
      </form>
      <div class="mt-6 border-t pt-4">
        <h3 class="text-sm font-semibold mb-2">AI Agent Edit</h3>
        <div class="flex gap-2">
          <input name="instruction" placeholder="e.g. Redesign the hero section with a gradient background..."
                 class="flex-1 border rounded px-3 py-2 text-sm" id="agent-instruction" />
          <button type="button"
                  hx-post="/api/agent/edit"
                  hx-vals='js:{"slug": "${page.slug}", "instruction": document.getElementById("agent-instruction").value}'
                  hx-target="#agent-result"
                  hx-indicator="#agent-spinner"
                  class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
            Run Agent
          </button>
        </div>
        <div id="agent-spinner" class="htmx-indicator text-sm text-gray-500 mt-2">Agent is working...</div>
        <div id="agent-result" class="mt-2 text-sm"></div>
      </div>
      <div class="mt-6 border-t pt-4">
        <h3 class="text-sm font-semibold mb-2">Version History</h3>
        <div hx-get="/api/pages/${page.slug}/versions" hx-trigger="load" hx-target="#versions-list"
             id="versions-list" class="text-sm text-gray-500">Loading versions...</div>
      </div>
    </div>
  `
}

export function renderNewPageForm() {
  return `
    <div class="border rounded-lg p-6" id="editor">
      <h2 class="text-xl font-semibold mb-4">Create New Page</h2>
      <form id="new-page-form">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Slug</label>
          <input name="slug" placeholder="my-page"
                 class="w-full border rounded px-3 py-2 text-sm" required />
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Title</label>
          <input name="title" placeholder="Page Title"
                 class="w-full border rounded px-3 py-2 text-sm" required />
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Content (HTML)</label>
          <textarea name="content" rows="15" placeholder="<h1>Hello World</h1>"
                    class="w-full border rounded px-3 py-2 font-mono text-sm"></textarea>
        </div>
        <div class="flex justify-end">
          <button type="button"
                  hx-post="/api/pages"
                  hx-vals='js:{"slug": document.querySelector("[name=slug]").value, "title": document.querySelector("[name=title]").value, "content": document.querySelector("[name=content]").value}'
                  hx-target="#editor"
                  class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Create Page</button>
        </div>
      </form>
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
