import type { NeonQueryFunction } from '@neondatabase/serverless'

// Get the latest version number for a page
export async function getLatestVersion(
  sql: NeonQueryFunction<false, false>,
  pageId: number
): Promise<number> {
  const result = await sql`
    SELECT MAX(version) as max_version FROM page_versions WHERE page_id = ${pageId}
  `
  const row = result[0]
  return (row?.max_version as number) || 0
}

// Get a specific version of a page
export async function getVersion(
  sql: NeonQueryFunction<false, false>,
  pageId: number,
  version: number
) {
  const result = await sql`
    SELECT * FROM page_versions
    WHERE page_id = ${pageId} AND version = ${version}
  `
  return result[0] || null
}

// Compare two versions
export async function diffVersions(
  sql: NeonQueryFunction<false, false>,
  pageId: number,
  versionA: number,
  versionB: number
) {
  const [a, b] = await Promise.all([
    getVersion(sql, pageId, versionA),
    getVersion(sql, pageId, versionB),
  ])

  if (!a || !b) return null

  return {
    versionA: a,
    versionB: b,
    titleChanged: a.title !== b.title,
    contentChanged: a.content !== b.content,
    metaChanged: JSON.stringify(a.meta) !== JSON.stringify(b.meta),
  }
}
