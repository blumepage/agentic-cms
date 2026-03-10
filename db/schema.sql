-- Agentic CMS Database Schema
-- Run against a Neon Postgres database

-- Pages table — current live content
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

-- Page versions table — full version history
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

-- Components table — reusable HTML fragments
CREATE TABLE IF NOT EXISTS components (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  html TEXT NOT NULL,
  props JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-versioning trigger
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

CREATE OR REPLACE TRIGGER page_version_trigger
AFTER INSERT OR UPDATE ON pages
FOR EACH ROW EXECUTE FUNCTION save_page_version();

-- Seed a sample page
INSERT INTO pages (slug, title, content, status, updated_by)
VALUES (
  'home',
  'Welcome to Agentic CMS',
  '<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
  <div class="max-w-4xl mx-auto px-4 py-16">
    <div class="text-center">
      <h1 class="text-5xl font-bold text-gray-900 mb-4">Ship Faster with AI</h1>
      <p class="text-xl text-gray-600 mb-8">Automated landing pages that update themselves. Edit with natural language, preview instantly, version everything.</p>
      <a href="/admin" class="inline-block px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
        Get Started
      </a>
    </div>
    <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="bg-white rounded-xl p-6 shadow-sm">
        <h3 class="text-lg font-semibold mb-2">AI-Powered Editing</h3>
        <p class="text-gray-600">Tell the agent what to change in plain English. It generates HTML, validates, and iterates.</p>
      </div>
      <div class="bg-white rounded-xl p-6 shadow-sm">
        <h3 class="text-lg font-semibold mb-2">Instant Preview</h3>
        <p class="text-gray-600">Changes go live immediately. No build step, no deploy. HTMX + Alpine.js for interactivity.</p>
      </div>
      <div class="bg-white rounded-xl p-6 shadow-sm">
        <h3 class="text-lg font-semibold mb-2">Full Version History</h3>
        <p class="text-gray-600">Every edit is versioned automatically. Rollback to any previous version with one click.</p>
      </div>
    </div>
  </div>
</div>',
  'published',
  'system'
) ON CONFLICT (slug) DO NOTHING;
