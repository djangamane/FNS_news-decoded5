const { Pool } = require('pg');

// The DATABASE_URL will be read from the environment variables
// set in your Vercel project settings.
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Recommended for Vercel/serverless environments to avoid SSL issues
    ssl: {
        rejectUnauthorized: false
    },
    // Without these an unreachable database does not error, it hangs: the
    // request never returns and the caller's try/catch never runs. Supabase's
    // direct connection is IPv6-only while Render is IPv4-only, which is
    // exactly how that happens. Fail fast so callers can fall back instead.
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    statement_timeout: 15000,
    max: 10
});

/**
 * Fetches article details from the database for a list of URLs.
 * @param {string[]} urls - An array of article URLs to look up.
 * @returns {Promise<Map<string, { content: string; imageUrl?: string; title: string }>>} A map of URL to article data.
 */
async function getArticlesByUrls(urls) {
    if (urls.length === 0) {
        return new Map();
    }

    const results = new Map();
    try {
        // Use a parameterized query to prevent SQL injection
        const query = {
            text: `
                SELECT source_url, title, text_content, image_url 
                FROM articles 
                WHERE source_url = ANY($1::text[])
            `,
            values: [urls],
        };
        
        const { rows } = await pool.query(query);

        for (const row of rows) {
            results.set(row.source_url, { 
                title: row.title, 
                content: row.text_content, 
                imageUrl: row.image_url 
            });
        }
    } catch (error) {
        console.error("Error querying articles from database:", error);
    }
    return results;
}

const BLOG_POSTS_TABLE = "blog_posts";

const normaliseTimestamp = (value) => {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
        return null;
    }

    return new Date(parsed).toISOString();
};

const mapBlogPostRow = (row) => ({
    id: row.id,
    sourceId: row.source_id || row.id,
    title: row.title || "Newsletter Update",
    content: row.content || "",
    relatedArticles: row.related_articles || undefined,
    publishedAt: normaliseTimestamp(row.published_at) || normaliseTimestamp(row.created_at) || new Date().toISOString(),
    createdAt: normaliseTimestamp(row.created_at),
    updatedAt: normaliseTimestamp(row.updated_at),
});

/**
 * Fetches published blog posts ordered by published_at descending.
 * @param {{ limit?: number, offset?: number }} options
 * @returns {Promise<object[]>}
 */
async function getPublishedBlogPosts(options = {}) {
    const limit = typeof options.limit === "number" && options.limit > 0 ? options.limit : 50;
    const offset = typeof options.offset === "number" && options.offset >= 0 ? options.offset : 0;

    const query = {
        text: `
            SELECT id, source_id, title, content, related_articles, published_at, created_at, updated_at
            FROM ${BLOG_POSTS_TABLE}
            WHERE published_at IS NOT NULL
            ORDER BY published_at DESC
            LIMIT $1 OFFSET $2
        `,
        values: [limit, offset],
    };

    const { rows } = await pool.query(query);
    return rows.map(mapBlogPostRow);
}

/**
 * Returns the latest blog posts intended for sitemap/RSS generation.
 * @param {number} [limit=200]
 * @returns {Promise<object[]>}
 */
async function getBlogPostsForFeed(limit = 200) {
    return getPublishedBlogPosts({ limit });
}

const NEWSLETTER_DRAFTS_TABLE = "newsletter_drafts";

const mapDraftRow = (row) => ({
    id: row.source_id,
    title: row.title || "Newsletter Update",
    newsletter: row.newsletter || "",
    relatedArticles: row.related_articles || undefined,
    publishedAt: normaliseTimestamp(row.published_at) || normaliseTimestamp(row.created_at),
});

/**
 * Inserts or updates one day's newsletter draft, keyed on its date.
 * @param {{ sourceId: string, title: string, newsletter: string, relatedArticles?: string, publishedAt: string }} draft
 * @returns {Promise<object>}
 */
async function upsertNewsletterDraft(draft) {
    const query = {
        text: `
            INSERT INTO ${NEWSLETTER_DRAFTS_TABLE}
                (source_id, title, newsletter, related_articles, published_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (source_id) DO UPDATE SET
                title = EXCLUDED.title,
                newsletter = EXCLUDED.newsletter,
                related_articles = EXCLUDED.related_articles,
                published_at = EXCLUDED.published_at,
                updated_at = NOW()
            RETURNING *
        `,
        values: [
            draft.sourceId,
            draft.title,
            draft.newsletter,
            draft.relatedArticles || null,
            draft.publishedAt,
        ],
    };

    const { rows } = await pool.query(query);
    return mapDraftRow(rows[0]);
}

/**
 * Returns newsletter drafts, newest first.
 * @param {{ limit?: number }} options
 * @returns {Promise<object[]>}
 */
async function getNewsletterDrafts(options = {}) {
    const limit = typeof options.limit === "number" && options.limit > 0 ? options.limit : 50;
    const { rows } = await pool.query({
        text: `
            SELECT * FROM ${NEWSLETTER_DRAFTS_TABLE}
            ORDER BY published_at DESC
            LIMIT $1
        `,
        values: [limit],
    });
    return rows.map(mapDraftRow);
}

module.exports = { getArticlesByUrls, getPublishedBlogPosts, getBlogPostsForFeed, upsertNewsletterDraft, getNewsletterDrafts };
