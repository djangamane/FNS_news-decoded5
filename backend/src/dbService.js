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
    }
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

module.exports = { getArticlesByUrls, getPublishedBlogPosts, getBlogPostsForFeed };
