const axios = require('axios');

// In-memory cache
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Delay function for respectful scraping
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if cache entry is valid
function isCacheValid(entry) {
  return Date.now() - entry.timestamp < CACHE_DURATION;
}

// Fetch article with retry logic
async function fetchArticle(url, retries = 3) {
  if (!process.env.FIRECRAWL_API_KEY) {
    throw new Error('FIRECRAWL_API_KEY environment variable is not set.');
  }

  // Check cache first
  if (cache.has(url) && isCacheValid(cache.get(url))) {
    return cache.get(url).data;
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Respectful delay
      await delay(1000 + Math.random() * 2000); // 1-3 seconds

      // Use Firecrawl API to handle all scraping complexity
      const response = await axios.post('https://api.firecrawl.dev/v0/scrape', {
        url: url,
        pageOptions: {
          onlyMainContent: true // Ask Firecrawl to extract the main content
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
        },
        timeout: 120000 // 120 seconds for JS rendering
      });

      if (!response.data || !response.data.success || !response.data.data) {
        throw new Error('Firecrawl API did not return successful data.');
      }

      const firecrawlData = response.data.data;
      const cleanedContent = firecrawlData.markdown || firecrawlData.content || '';

      if (!cleanedContent.trim()) {
        throw new Error('Could not extract meaningful content from the article.');
      }

      const title = firecrawlData.metadata?.title || 'Untitled';
      const imageUrl = firecrawlData.metadata?.ogImage || null;

      const excerpt = cleanedContent.substring(0, 300) + (cleanedContent.length > 300 ? '...' : '');

      const articleData = {
        url,
        title: title.trim(),
        content: cleanedContent.trim(),
        excerpt: excerpt.trim(),
        imageUrl,
        fetchedAt: new Date().toISOString()
      };

      // Cache the result
      cache.set(url, {
        data: articleData,
        timestamp: Date.now()
      });

      return articleData;

    } catch (error) {
      // Only log the message and data to avoid exposing the API key in the full error object
      const errorMessage = error.response?.data?.error || error.message;
      console.error(`Attempt ${attempt + 1} failed for ${url}: ${errorMessage}`);

      if (attempt === retries - 1) {
        let finalMessage = `Failed to fetch article after ${retries} attempts for url: ${url}. Error: ${error.message}`;
        if (error.response?.data) {
          // Include the response from the proxy to make debugging easier
          finalMessage += ` | Proxy Response: ${error.response.data}`;
        }
        const finalError = new Error(finalMessage);
        throw finalError;
      }

      // Exponential backoff
      await delay(Math.pow(2, attempt) * 1000);
    }
  }
}

// Batch fetch articles
async function fetchArticles(urls) {
  const results = [];
  const errors = [];

  for (const url of urls) {
    try {
      const article = await fetchArticle(url);
      results.push(article);
    } catch (error) {
      errors.push({ url, error: error.message });
    }
  }

  return { results, errors };
}

// Clear expired cache entries
function clearExpiredCache() {
  for (const [url, entry] of cache.entries()) {
    if (!isCacheValid(entry)) {
      cache.delete(url);
    }
  }
}

// Run cache cleanup every 5 minutes
setInterval(clearExpiredCache, 5 * 60 * 1000);

module.exports = {
  fetchArticle,
  fetchArticles,
  clearExpiredCache
};