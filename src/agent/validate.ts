export async function httpValidate(slug: string, baseUrl: string): Promise<string[]> {
  const issues: string[] = []
  const url = `${baseUrl}/page/${slug}`

  let res: Response
  try {
    res = await fetch(url)
  } catch {
    issues.push(`Failed to fetch page at ${url}`)
    return issues
  }

  if (!res.ok) {
    issues.push(`Page returned HTTP ${res.status}`)
    return issues
  }

  const html = await res.text()

  // Has content
  if (html.trim().length < 100) issues.push('Page appears empty or nearly empty')

  // Valid HTML structure
  if (!html.includes('</body>')) issues.push('Missing closing body tag')
  if (!html.includes('</html>')) issues.push('Missing closing html tag')

  // Has h1
  if (!/<h1[\s>]/i.test(html)) issues.push('No h1 tag found')

  // Images have alt tags
  const imgWithoutAlt = html.match(/<img(?![^>]*alt=)[^>]*>/gi)
  if (imgWithoutAlt) issues.push(`${imgWithoutAlt.length} image(s) missing alt text`)

  // HTMX attributes have non-empty values
  const emptyHtmx = html.match(/hx-(get|post|put|delete)=""/gi)
  if (emptyHtmx) issues.push(`${emptyHtmx.length} empty HTMX attribute(s)`)

  // Links have href
  const emptyLinks = html.match(/<a(?![^>]*href=)[^>]*>/gi)
  if (emptyLinks) issues.push(`${emptyLinks.length} link(s) missing href`)

  // No unclosed Alpine x-data
  const xDataMatches = html.match(/x-data="[^"]*$/gm)
  if (xDataMatches) issues.push('Unclosed x-data attribute')

  // Check for broken internal links
  const internalLinks = [...html.matchAll(/href="(\/[^"]+)"/g)].map(m => m[1])
  for (const link of internalLinks.slice(0, 10)) {
    try {
      const linkRes = await fetch(`${baseUrl}${link}`, { method: 'HEAD' })
      if (!linkRes.ok) issues.push(`Broken internal link: ${link}`)
    } catch {
      issues.push(`Broken internal link: ${link}`)
    }
  }

  return issues
}
