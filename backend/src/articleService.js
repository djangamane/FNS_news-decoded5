const { scrapeArticle } = require("./aiScrapingService");

// In-memory cache with a Time-To-Live (TTL) to keep articles fresh.
const articleCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Fetch article with retry logic
async function fetchArticle(url, retries = 3) {
  // 1. Check for a fresh, valid item in the cache first.
  const cachedItem = articleCache.get(url);
  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
    console.log(`Returning cached version for: ${url}`);
    return cachedItem.data;
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const articleData = await scrapeArticle(url);

      if (!articleData.textContent) {
        // Only fail if the scraper returned no text at all.
        throw new Error("Scraped article has no text content.");
      }

      const result = {
        url,
        title: articleData.title,
        content: articleData.textContent,
        imageUrl: articleData.imageUrl,
        fetchedAt: new Date().toISOString(),
      };

      // 2. Store the successful result in the cache with a timestamp.
      articleCache.set(url, { data: result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error(
        `Attempt ${attempt + 1} failed for ${url}: ${error.message}`,
      );
      console.error(`Error details:`, error.stack);

      if (attempt === retries - 1) {
        throw new Error(
          `Failed to fetch article after ${retries} attempts for url: ${url}. Error: ${error.message}`,
        );
      }

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000),
      );
    }
  }
}

// Batch fetch articles
async function fetchArticles(urls) {
  console.log(
    `Starting sequential batch fetch for ${urls.length} URLs to respect API rate limits.`,
  );

  const results = [];
  const errors = [];

  for (const url of urls) {
    try {
      // Process one URL at a time.
      const result = await fetchArticle(url);
      results.push(result);
      console.log(
        `Successfully fetched article from: ${url}, content length: ${result.content.length} characters`,
      );
    } catch (error) {
      // If a specific fetch failed, record it.
      errors.push({ url, error: error.message });
      console.error(`Failed to fetch article from: ${url}, error: ${error.message}`);
    }

    // Add a cool-down period between each article to respect API rate limits,
    // even if the previous one failed quickly. 5 seconds is a safe delay.
    if (urls.indexOf(url) < urls.length - 1) {
      console.log("Waiting 5 seconds before processing the next article...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.log(`Batch fetch completed. Successful: ${results.length}, Failed: ${errors.length}`);
  return { results, errors };
}

module.exports = {
  fetchArticle,
  fetchArticles,
};
