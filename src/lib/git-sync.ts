import { neon } from '@neondatabase/serverless'

interface GitEnv {
  GITHUB_TOKEN: string
  GITHUB_REPO: string
}

interface FullEnv extends GitEnv {
  DATABASE_URL: string
}

// Sync a single page to GitHub via the Contents API (commits to main)
export async function gitSyncPage(
  slug: string,
  page: Record<string, unknown>,
  env: GitEnv
) {
  const path = `content/pages/${slug}.html`
  const repo = env.GITHUB_REPO
  const token = env.GITHUB_TOKEN
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'agentic-cms'
  }

  // Check if file already exists (to get its SHA for updates)
  const existing = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}`,
    { headers }
  )
  const sha = existing.ok ? ((await existing.json()) as { sha: string }).sha : undefined

  // Commit the file
  await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `content(${slug}): updated by ${page.updated_by}`,
      content: btoa(String(page.content)),
      sha,
    })
  })

  // Also sync metadata
  const metaPath = `content/pages/${slug}.json`
  const existingMeta = await fetch(
    `https://api.github.com/repos/${repo}/contents/${metaPath}`,
    { headers }
  )
  const metaSha = existingMeta.ok ? ((await existingMeta.json()) as { sha: string }).sha : undefined

  await fetch(`https://api.github.com/repos/${repo}/contents/${metaPath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `meta(${slug}): updated by ${page.updated_by}`,
      content: btoa(JSON.stringify({
        title: page.title,
        meta: page.meta,
        status: page.status,
        updated_at: page.updated_at,
        updated_by: page.updated_by
      }, null, 2)),
      sha: metaSha,
    })
  })
}

// For agent changes, open a PR instead of committing to main
export async function gitSyncAsPR(
  slug: string,
  page: Record<string, unknown>,
  env: GitEnv
) {
  const repo = env.GITHUB_REPO
  const token = env.GITHUB_TOKEN
  const branchName = `agent/${slug}-${Date.now()}`
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'agentic-cms'
  }

  // 1. Get main branch SHA
  const mainRef = await fetch(
    `https://api.github.com/repos/${repo}/git/ref/heads/main`,
    { headers }
  )
  if (!mainRef.ok) return // can't sync if main doesn't exist

  const mainRefData = await mainRef.json() as { object: { sha: string } }

  // 2. Create branch
  const branchRes = await fetch(`https://api.github.com/repos/${repo}/git/refs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: mainRefData.object.sha
    })
  })
  if (!branchRes.ok) return

  // 3. Commit content to branch
  const path = `content/pages/${slug}.html`
  const existing = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}?ref=${branchName}`,
    { headers }
  )
  const sha = existing.ok ? ((await existing.json()) as { sha: string }).sha : undefined

  await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `content(${slug}): agent update`,
      content: btoa(String(page.content)),
      sha,
      branch: branchName
    })
  })

  // 4. Open PR
  await fetch(`https://api.github.com/repos/${repo}/pulls`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: `[Agent] Update ${slug}`,
      head: branchName,
      base: 'main',
      body: `Automated content update for \`${slug}\` by AI agent.`
    })
  })
}

// Cron-triggered: sync all recently changed pages
export async function syncAllToGit(env: FullEnv) {
  const sql = neon(env.DATABASE_URL)
  const recentlyChanged = await sql`
    SELECT * FROM pages
    WHERE updated_at > now() - interval '10 minutes'
  `
  for (const page of recentlyChanged) {
    const pageRecord = page as Record<string, unknown>
    if (pageRecord.updated_by === 'ai-agent') {
      await gitSyncAsPR(pageRecord.slug as string, pageRecord, env)
    } else {
      await gitSyncPage(pageRecord.slug as string, pageRecord, env)
    }
  }
}
