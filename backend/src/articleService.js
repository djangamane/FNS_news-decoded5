const axios = require("axios");

const cache = new Map();

// Fetch article with retry logic
async function fetchArticle(url, retries = 3) {
  if (cache.has(url)) {
    const cachedData = cache.get(url);
    if (cachedData.expiry > Date.now()) {
      return cachedData.data;
    }
  }

  if (!process.env.FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY environment variable is not set.");
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Use Firecrawl API to handle all scraping complexity
      const response = await axios.post(
        "https://api.firecrawl.dev/v0/scrape",
        {
          url: url,
          pageOptions: {
            onlyMainContent: true, // Ask Firecrawl to extract the main content
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          },
          timeout: 120000, // 120 seconds for JS rendering
        },
      );

      if (!response.data || !response.data.success || !response.data.data) {
        throw new Error("Firecrawl API did not return successful data.");
      }

      const firecrawlData = response.data.data;
      const cleanedContent =
        firecrawlData.markdown || firecrawlData.content || "";

      if (!cleanedContent.trim()) {
        throw new Error(
          "Could not extract meaningful content from the article.",
        );
      }

      const title = firecrawlData.metadata?.title || "Untitled";
      console.log("Firecrawl metadata:", firecrawlData.metadata);
      const imageUrl =
        firecrawlData.metadata?.ogImage ||
        firecrawlData.metadata?.image ||
        firecrawlData.metadata?.twitterImage ||
        null;

      const excerpt =
        cleanedContent.substring(0, 300) +
        (cleanedContent.length > 300 ? "..." : "");

      const articleData = {
        url,
        title: title.trim(),
        content: cleanedContent.trim(),
        excerpt: excerpt.trim(),
        imageUrl,
        fetchedAt: new Date().toISOString(),
      };

      cache.set(url, { data: articleData, expiry: Date.now() + 3600000 }); // Cache for 1 hour

      return articleData;
    } catch (error) {
      // Only log the message and data to avoid exposing the API key in the full error object
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "An unknown error occurred";
      console.error(
        `Attempt ${attempt + 1} failed for ${url}: ${errorMessage}`,
      );

      if (attempt === retries - 1) {
        let finalMessage = `Failed to fetch article after ${retries} attempts for url: ${url}. Error: ${error.message}`;
        if (error.response?.data) {
          // Include the response from the proxy to make debugging easier
          finalMessage += ` | Proxy Response: ${JSON.stringify(error.response.data)}`;
        }
        const finalError = new Error(finalMessage);
        throw finalError;
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
