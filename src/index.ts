import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { pages } from './routes/pages'
import { admin } from './routes/admin'
import { api } from './routes/api'
import { dbMiddleware } from './middleware/db'
import { cacheMiddleware } from './middleware/cache'
import { branchMiddleware } from './middleware/branch'
import { AgentSession } from './agent/durable-object'
import { syncAllToGit } from './lib/git-sync'
import type { HonoEnv, Env } from './types'

const app = new Hono<HonoEnv>()

app.use('*', cors())
app.use('*', dbMiddleware)
app.use('/page/*', branchMiddleware)
app.use('/page/*', cacheMiddleware)

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'agentic-cms',
    status: 'ok',
    endpoints: {
      pages: '/page/:slug',
      admin: '/admin',
      api: '/api/pages',
      agent: '/api/agent/edit',
    }
  })
})

app.route('/page', pages)
app.route('/admin', admin)
app.route('/api', api)

export default {
  fetch: app.fetch,
  // Cron trigger for git sync
  async scheduled(_event: ScheduledEvent, env: Env) {
    await syncAllToGit(env)
  }
}

export { AgentSession }
