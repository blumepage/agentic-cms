import { neon } from '@neondatabase/serverless'
import type { MiddlewareHandler } from 'hono'
import type { HonoEnv } from '../types'

export const dbMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const branch = c.get('neonBranch')
  const dbUrl = branch
    ? c.env.DATABASE_URL.replace('/neondb', `/neondb?options=project%3D${branch}`)
    : c.env.DATABASE_URL
  c.set('sql', neon(dbUrl))
  await next()
}
