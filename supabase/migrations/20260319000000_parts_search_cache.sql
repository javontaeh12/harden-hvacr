-- Parts search cache for multi-supplier search results
CREATE TABLE IF NOT EXISTS parts_search_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash text UNIQUE NOT NULL,
  query_text text NOT NULL,
  results jsonb NOT NULL DEFAULT '[]',
  result_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Index for fast hash lookups and cache expiration cleanup
CREATE INDEX IF NOT EXISTS idx_parts_search_cache_hash ON parts_search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_parts_search_cache_expires ON parts_search_cache(expires_at);

-- RLS: allow service role full access (API route uses service client)
ALTER TABLE parts_search_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on parts_search_cache"
  ON parts_search_cache FOR ALL
  USING (true)
  WITH CHECK (true);
