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

module.exports = { getArticlesByUrls };