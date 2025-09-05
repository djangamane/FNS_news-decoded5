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

      // Enable JavaScript rendering and premium proxies for better success rate against services like Cloudflare
      const scraperApiUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=true&premium=true`;

      const response = await axios.get(scraperApiUrl, {
        timeout: 120000, // Increased to 120 seconds for JS rendering
        maxRedirects: 5
      });

      let title = 'Untitled';
      let content = '';
      let imageUrl = null;

      // Try Readability first for better content extraction
      try {
        const dom = new JSDOM(response.data, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (article) {
          title = article.title || 'Untitled';
          content = article.textContent || '';

          // Extract image from Readability content
          if (article.content) {
            const $ = cheerio.load(article.content);
            const img = $('img').first();
            if (img.length) {
              const src = img.attr('src');
              if (src) {
                try { imageUrl = new URL(src, url).href; }
                catch (e) { imageUrl = null; }
              }
            }
          }
        } else {
          throw new Error('Readability failed to parse');
        }
      } catch (readabilityError) {
        console.log('Readability failed, falling back to cheerio extraction:', readabilityError.message);

        // Fallback to cheerio-based extraction
        const $ = cheerio.load(response.data);

        // Extract title
        title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="title"]').attr('content') ||
                $('title').text() ||
                $('article h1').first().text() ||
                $('h1').first().text() ||
                'Untitled';

        // Find main content container
        let contentElement = $('article').first();
        if (!contentElement.length) {
          contentElement = $('main').first();
        }
        if (!contentElement.length) {
          contentElement = $('body');
        }

        // Remove unwanted elements
        contentElement.find('nav, aside, footer, header, .ad, .ads, .advertisement, .related, .comments, .social-share, .newsletter, .sidebar, .popup, .modal, .banner').remove();

        // Extract text from relevant elements
        // Extract text from relevant elements, preserving paragraph breaks
        content = contentElement.find('p, h1, h2, h3, h4, h5, h6, li').map((i, el) => $(el).text().trim()).get().join('\n\n');

      }

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

      let cleanedContent = paragraphs.join('\n\n').trim();

      // If our aggressive filtering removed everything, fall back to the original content
      // to ensure we at least return something.
      if (!cleanedContent && content.trim().length > 0) {
        console.log(`Content filtering was too aggressive for ${url}. Falling back to unfiltered content.`);
        cleanedContent = content.trim();
      }

      if (!cleanedContent) {
        throw new Error('Could not extract meaningful content from the article.');
      }

      // Fallback to meta tags if Readability didn't find an image
      if (!imageUrl) {
        const $ = cheerio.load(response.data);
        imageUrl = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content');
        if (imageUrl) {
          try { imageUrl = new URL(imageUrl, url).href; }
          catch (e) { imageUrl = null; }
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
      console.error(`Attempt ${attempt + 1} failed for ${url}:`, error);

      if (attempt === retries - 1) {
        throw new Error(`Failed to fetch article after ${retries} attempts: ${error.stack || error.message}`);
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