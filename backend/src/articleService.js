const { getArticlesByUrls } = require("./dbService");

// In-memory cache can still be useful to reduce DB load for very frequent requests.
const articleCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetches a batch of articles efficiently from the database.
 * @param {string[]} urls - An array of article URLs.
 * @returns {Promise<{results: object[], errors: object[]}>}
 */
async function fetchArticles(urls) {
  console.log(`Starting batch fetch from database for ${urls.length} URLs.`);
  const results = [];
  const errors = [];
 
  const articlesFromDb = await getArticlesByUrls(urls);
 
  for (const url of urls) {
      const articleData = articlesFromDb.get(url);
      if (articleData && articleData.content) {
          const result = {
              url,
              title: articleData.title,
              content: articleData.content,
              imageUrl: articleData.imageUrl,
          };
          results.push(result);
      } else {
          const errorMessage = `Article not found or has no content in DB for url: ${url}`;
          errors.push({ url, error: errorMessage });
          console.error(errorMessage);
      }
  }
 
  console.log(`Batch fetch completed. Successful: ${results.length}, Failed: ${errors.length}`);
  return { results, errors };
}

// The single fetchArticle function can be simplified or removed if you only use batch fetching.
async function fetchArticle(url) {
    const { results } = await fetchArticles([url]);
    if (results.length > 0) {
        return results[0];
    }
    throw new Error(`Article not found in database for url: ${url}`);
}

module.exports = {
  fetchArticle,
  fetchArticles,
};
