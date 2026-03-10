import type { NeonQueryFunction } from '@neondatabase/serverless'

export type Env = {
  DATABASE_URL: string
  GITHUB_TOKEN: string
  GITHUB_REPO: string
  CLAUDE_API_KEY: string
  ADMIN_SECRET: string
  BASE_URL: string
  AGENT_SESSION: DurableObjectNamespace
}

export type HonoEnv = {
  Bindings: Env
  Variables: {
    sql: NeonQueryFunction<false, false>
    neonBranch?: string
  }
}

export interface Project {
  id: number
  name: string
  slug: string
  custom_domain: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ProjectFile {
  id: number
  project_id: number
  path: string
  content: string
  content_type: string
  is_dynamic: boolean
  meta: Record<string, unknown>
  updated_at: string
  updated_by: string
}

export interface FileVersion {
  id: number
  file_id: number
  content: string
  version: number
  created_by: string
  message: string
  created_at: string
}

// Legacy types kept for backward compat
export interface Page {
  id: number
  slug: string
  title: string
  content: string
  meta: Record<string, string>
  status: string
  updated_at: string
  updated_by: string
}

export interface PageVersion {
  id: number
  page_id: number
  title: string
  content: string
  meta: Record<string, string>
  version: number
  created_by: string
  message: string
  created_at: string
}

export interface Component {
  id: number
  name: string
  html: string
  props: Record<string, unknown>
  updated_at: string
}
