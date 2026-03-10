-- Agentic CMS Database Schema
-- Run against a Neon Postgres database

-- Projects table — each project is a deployable site
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  custom_domain TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_domain ON projects(custom_domain);

-- Files table — every file in a project (HTML, CSS, JS, images, API routes)
CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'text/html',
  is_dynamic BOOLEAN DEFAULT false,
  meta JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'system',
  UNIQUE(project_id, path)
);

CREATE INDEX IF NOT EXISTS idx_files_project_path ON files(project_id, path);

-- File versions table — full version history per file
CREATE TABLE IF NOT EXISTS file_versions (
  id SERIAL PRIMARY KEY,
  file_id INT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version INT NOT NULL,
  created_by TEXT DEFAULT 'system',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_versions_file ON file_versions(file_id, version DESC);

-- Components table — reusable HTML fragments (shared across projects)
CREATE TABLE IF NOT EXISTS components (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  html TEXT NOT NULL,
  props JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-versioning trigger for files
CREATE OR REPLACE FUNCTION save_file_version()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO file_versions (file_id, content, version, created_by, message)
  VALUES (
    NEW.id,
    NEW.content,
    COALESCE((SELECT MAX(version) FROM file_versions WHERE file_id = NEW.id), 0) + 1,
    NEW.updated_by,
    'Auto-versioned on update'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS file_version_trigger ON files;
CREATE TRIGGER file_version_trigger
AFTER INSERT OR UPDATE ON files
FOR EACH ROW EXECUTE FUNCTION save_file_version();

-- Legacy tables (kept for backward compat)
CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);

CREATE TABLE IF NOT EXISTS page_versions (
  id SERIAL PRIMARY KEY,
  page_id INT REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  version INT NOT NULL,
  created_by TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_versions_page ON page_versions(page_id, version DESC);

CREATE OR REPLACE FUNCTION save_page_version()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO page_versions (page_id, title, content, meta, version, created_by, message)
  VALUES (
    NEW.id,
    NEW.title,
    NEW.content,
    NEW.meta,
    COALESCE((SELECT MAX(version) FROM page_versions WHERE page_id = NEW.id), 0) + 1,
    NEW.updated_by,
    'Auto-versioned on update'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS page_version_trigger ON pages;
CREATE TRIGGER page_version_trigger
AFTER INSERT OR UPDATE ON pages
FOR EACH ROW EXECUTE FUNCTION save_page_version();
