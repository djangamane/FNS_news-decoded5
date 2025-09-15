const { scrapeArticle } = require("./puppeteerService");

// Fetch article with retry logic
async function fetchArticle(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const articleData = await scrapeArticle(url);

      if (!articleData.textContent) {
        throw new Error(
          "Could not extract meaningful content from the article.",
        );
      }

      return {
        url,
        title: articleData.title,
        content: articleData.textContent,
        imageUrl: articleData.imageUrl,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        `Attempt ${attempt + 1} failed for ${url}: ${error.message}`,
      );

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
  // Run all fetch operations in parallel for much faster batch processing
  const promises = urls.map((url) => fetchArticle(url));
  const outcomes = await Promise.allSettled(promises);

  const results = [];
  const errors = [];

  outcomes.forEach((outcome, index) => {
    if (outcome.status === "fulfilled") {
      results.push(outcome.value);
    } else {
      // If a specific fetch failed, record it.
      errors.push({ url: urls[index], error: outcome.reason.message });
    }
  });

  return { results, errors };
}

module.exports = {
  fetchArticle,
  fetchArticles,
};
