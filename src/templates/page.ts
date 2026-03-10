import { layout } from './layout'

export function renderPage(title: string, content: string, meta: Record<string, string> = {}) {
  return layout(title, content, meta)
}
