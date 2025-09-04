const axios = require('axios');
const cheerio = require('cheerio');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

// In-memory cache
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// User agents for rotation
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
];

let currentUserAgentIndex = 0;

// Get next user agent
function getNextUserAgent() {
  const userAgent = userAgents[currentUserAgentIndex];
  currentUserAgentIndex = (currentUserAgentIndex + 1) % userAgents.length;
  return userAgent;
}

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
  // Check cache first
  if (cache.has(url) && isCacheValid(cache.get(url))) {
    return cache.get(url).data;
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Respectful delay
      await delay(1000 + Math.random() * 2000); // 1-3 seconds

      const response = await axios.get(url, {
        headers: {
          'User-Agent': getNextUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000,
        maxRedirects: 5
      });

      // Use Readability for better content extraction
      const dom = new JSDOM(response.data, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      let title = article.title || 'Untitled';
      let content = article.textContent || '';

      // Additional filtering: remove very short paragraphs (likely ads or navigation)
      const paragraphs = content.split('\n\n').filter(p => {
        const trimmed = p.trim();
        return trimmed.length > 50 && // Minimum length
               !trimmed.toLowerCase().includes('subscribe') &&
               !trimmed.toLowerCase().includes('newsletter') &&
               !trimmed.toLowerCase().includes('advertisement') &&
               !trimmed.toLowerCase().includes('related articles') &&
               !trimmed.toLowerCase().includes('share this') &&
               !trimmed.toLowerCase().includes('follow us') &&
               !trimmed.toLowerCase().includes('copyright') &&
               !trimmed.toLowerCase().includes('all rights reserved');
      });

      const cleanedContent = paragraphs.join('\n\n').replace(/\s+/g, ' ').trim();

      // Extract main image
      let imageUrl = null;
      if (article.content) {
        const $ = cheerio.load(article.content);
        const img = $('img').first();
        if (img.length) {
          imageUrl = img.attr('src');
          if (imageUrl && !imageUrl.startsWith('http')) {
            // Relative URL, make absolute
            try {
              imageUrl = new URL(imageUrl, url).href;
            } catch (e) {
              imageUrl = null;
            }
          }
        }
      }
      // Fallback to meta tags
      if (!imageUrl) {
        const $ = cheerio.load(response.data);
        imageUrl = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content');
        if (imageUrl && !imageUrl.startsWith('http')) {
          try {
            imageUrl = new URL(imageUrl, url).href;
          } catch (e) {
            imageUrl = null;
          }
        }
      }

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
      console.error(`Attempt ${attempt + 1} failed for ${url}:`, error.message);

      if (attempt === retries - 1) {
        throw new Error(`Failed to fetch article after ${retries} attempts: ${error.message}`);
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