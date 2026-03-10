import type { MiddlewareHandler } from 'hono'
import type { HonoEnv } from '../types'

export const cacheMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const cache = caches.default
  const cacheKey = new Request(c.req.url)

  const cached = await cache.match(cacheKey)
  if (cached) return new Response(cached.body, cached)

  await next()

  const response = c.res.clone()
  response.headers.set('Cache-Control', 'public, max-age=10')
  c.executionCtx.waitUntil(cache.put(cacheKey, response))
}

export async function purgePageCache(slug: string, baseUrl: string) {
  const cache = caches.default
  await cache.delete(new Request(`${baseUrl}/page/${slug}`))
}
