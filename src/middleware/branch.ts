import type { MiddlewareHandler } from 'hono'
import type { HonoEnv } from '../types'

function extractSubdomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname
    const parts = hostname.split('.')
    if (parts.length > 2) {
      return parts[0]
    }
    return null
  } catch {
    return null
  }
}

export const branchMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const branch = c.req.header('x-neon-branch')
    || c.req.query('branch')
    || extractSubdomain(c.req.url)

  if (branch && branch !== 'main') {
    c.set('neonBranch', branch)
  }

  await next()
}
