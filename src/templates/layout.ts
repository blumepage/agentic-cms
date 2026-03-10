export function layout(title: string, body: string, meta: Record<string, string> = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${meta.description ? `<meta name="description" content="${escapeHtml(meta.description)}">` : ''}
  ${meta.og_image ? `<meta property="og:image" content="${escapeHtml(meta.og_image)}">` : ''}
  <script src="https://unpkg.com/htmx.org@2.0.4"></script>
  <script defer src="https://unpkg.com/alpinejs@3.14.8/dist/cdn.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: { 50: '#f0f4ff', 100: '#dbe4ff', 200: '#bac8ff', 300: '#91a7ff', 400: '#748ffc', 500: '#5c7cfa', 600: '#4c6ef5', 700: '#4263eb', 800: '#3b5bdb', 900: '#364fc7' },
            surface: { 50: '#f8f9fa', 100: '#f1f3f5', 200: '#e9ecef', 300: '#dee2e6', 400: '#ced4da', 500: '#adb5bd', 600: '#868e96', 700: '#495057', 800: '#343a40', 900: '#212529' }
          }
        }
      }
    }
  </script>
  <style>
    [x-cloak] { display: none !important; }
    .htmx-indicator { opacity: 0; transition: opacity 200ms ease-in; }
    .htmx-request .htmx-indicator, .htmx-request.htmx-indicator { opacity: 1; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
    @keyframes pulse-dot { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
    .loading-dot { animation: pulse-dot 1.4s infinite ease-in-out both; }
    .loading-dot:nth-child(1) { animation-delay: -0.32s; }
    .loading-dot:nth-child(2) { animation-delay: -0.16s; }
  </style>
</head>
<body class="bg-surface-50 text-surface-900 antialiased">
  ${body}
</body>
</html>`
}

export function adminLayout(title: string, body: string) {
  return layout(title, `
    <div class="min-h-screen flex">
      <aside class="w-64 bg-surface-900 text-white flex flex-col shrink-0">
        <div class="p-5 border-b border-surface-700">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div>
              <span class="font-semibold text-sm">Agentic CMS</span>
              <span class="block text-[10px] text-surface-400 -mt-0.5">AI-powered pages</span>
            </div>
          </div>
        </div>
        <nav class="flex-1 p-3 space-y-1">
          <a href="/admin" class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium bg-white/10 text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            Projects
          </a>
          <a href="/api/components" class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-surface-400 hover:text-white hover:bg-white/5 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"/></svg>
            Components
          </a>
        </nav>
        <div class="p-3 border-t border-surface-700">
          <div class="px-3 py-2 text-[11px] text-surface-500">Powered by Cloudflare Workers + Neon</div>
        </div>
      </aside>
      <main class="flex-1 overflow-auto">
        ${body}
      </main>
    </div>
  `)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
