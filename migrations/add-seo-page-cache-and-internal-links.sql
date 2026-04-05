-- SEO programmatic pages: cache for AI summaries and metadata
CREATE TABLE IF NOT EXISTS page_cache (
  id SERIAL PRIMARY KEY,
  page_type VARCHAR(64) NOT NULL,
  page_slug VARCHAR(256) NOT NULL,
  entity_key VARCHAR(256) NOT NULL,
  title TEXT,
  meta_description TEXT,
  h1 TEXT,
  ai_summary TEXT,
  ai_json JSONB,
  rendered_payload_json JSONB,
  version_hash VARCHAR(64),
  last_generated_at TIMESTAMPTZ,
  last_revalidated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT page_cache_type_slug_unique UNIQUE (page_type, page_slug)
);

CREATE INDEX IF NOT EXISTS page_cache_entity_key_idx ON page_cache(entity_key);

-- Internal linking: source -> target for SEO
CREATE TABLE IF NOT EXISTS internal_links (
  id SERIAL PRIMARY KEY,
  source_slug VARCHAR(256) NOT NULL,
  target_slug VARCHAR(256) NOT NULL,
  link_type VARCHAR(64) NOT NULL,
  score INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS internal_links_source_idx ON internal_links(source_slug);
