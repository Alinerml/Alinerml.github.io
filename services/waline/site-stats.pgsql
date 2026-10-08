-- Add visitor statistics to the existing database without changing Waline data.
-- Safe to apply more than once; run as a deployment migration, never per request.
BEGIN;

CREATE TABLE IF NOT EXISTS blog_site_stats (
  singleton smallint PRIMARY KEY CHECK (singleton = 1),
  visitors bigint NOT NULL DEFAULT 0 CHECK (visitors >= 0),
  views bigint NOT NULL DEFAULT 0 CHECK (views >= 0),
  started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blog_site_visitors (
  visitor_hash text PRIMARY KEY CHECK (visitor_hash ~ '^[0-9a-f]{64}$')
);

INSERT INTO blog_site_stats (singleton) VALUES (1) ON CONFLICT (singleton) DO NOTHING;

COMMIT;
