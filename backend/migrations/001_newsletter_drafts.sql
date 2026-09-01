-- Drafts pushed daily by the soWSnewsletter GitHub Action via POST /api/blog/ingest.
-- This replaces the Google Sheet that an external Make scenario used to write to;
-- that scenario stopped running on 2025-06-04 and nothing reported the failure.

CREATE TABLE IF NOT EXISTS newsletter_drafts (
    id BIGSERIAL PRIMARY KEY,
    -- The newsletter's own date, so a re-run of the same day updates in place
    -- instead of creating a duplicate.
    source_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    newsletter TEXT NOT NULL,
    related_articles TEXT,
    published_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS newsletter_drafts_published_at_idx
    ON newsletter_drafts (published_at DESC);
