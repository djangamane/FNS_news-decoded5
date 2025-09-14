import { Article, ArticleAnalysis } from "../types";
import { supabase } from "./supabaseClient";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3002";

/**
 * Extracts a user-friendly source name from a URL.
 * @param url The full URL of the article.
 * @returns A formatted source name (e.g., 'example.com').
 */
const getSourceFromUrl = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    // Remove 'www.' for cleaner presentation
    return hostname.replace(/^www\./, "");
  } catch (error) {
    console.error("Could not parse URL for source:", url);
    return "Unknown Source";
  }
};

/**
 * Extracts the actual URL from a Google redirect URL.
 * @param url The potentially redirected URL.
 * @returns The extracted URL or the original if not a redirect.
 */
const extractRealUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === "www.google.com" && urlObj.pathname === "/url") {
      const realUrl = urlObj.searchParams.get("url");
      return realUrl || url;
    }
    return url;
  } catch (error) {
    return url;
  }
};

/**
 * Fetches details for multiple articles in a single batch request.
 * @param articlesToFetch An array of article objects that need details.
 * @returns A Map where keys are article URLs and values are the fetched details.
 */
const fetchBatchArticleDetails = async (
  articlesToFetch: any[],
): Promise<Map<string, { text: string; imageUrl?: string }>> => {
  const urls = articlesToFetch.map((a) => extractRealUrl(a.url));
  if (urls.length === 0) {
    return new Map();
  }

  const apiUrl = `${BACKEND_URL}/api/articles/batch`;
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });

    if (!response.ok) {
      throw new Error(
        `Backend batch API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();
    if (!result.success || !result.data?.articles) {
      throw new Error("Invalid response from backend batch API");
    }

    const detailsMap = new Map<string, { text: string; imageUrl?: string }>();
    result.data.articles.forEach((article: any) => {
      detailsMap.set(article.url, {
        text: article.content,
        imageUrl: article.imageUrl,
      });
    });
    return detailsMap;
  } catch (error) {
    console.error("Error in fetchBatchArticleDetails:", error);
    return new Map(); // Return empty map on failure to prevent crashing Promise.all
  }
};
/**
 * Fetches the full text of an article from the backend API.
 * @param url The article URL.
 * @param fallbackText Optional fallback text from GitHub JSON.
 * @returns The extracted text or fallback.
 */
const fetchArticleText = async (
  url: string,
  fallbackText?: string,
): Promise<{ text: string; imageUrl?: string }> => {
  const realUrl = extractRealUrl(url);
  const apiUrl = `${BACKEND_URL}/api/articles/fetch?url=${encodeURIComponent(realUrl)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35-second timeout

    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // This will catch 500 errors and other non-successful statuses
      throw new Error(
        `Backend API error: ${response.status} ${response.statusText}`,
      );
    }
    const result = await response.json();
    // Check for a successful response structure and non-empty content
    if (result.success && result.data?.content) {
      const fetchedText = result.data.content.trim();
      if (fetchedText) {
        // Ensure content is not just whitespace
        return { text: fetchedText, imageUrl: result.data.imageUrl };
      }
    }
    // Throw if the response structure is invalid or content is empty
    throw new Error("Invalid or empty content from backend API");
  } catch (error) {
    console.error(
      `Error fetching article from backend for url: ${realUrl}`,
      error,
    );
  }

  // If the try block failed for any reason, try to use the fallback text
  if (fallbackText && fallbackText.trim().length > 100) {
    return { text: fallbackText.trim() };
  }

  return { text: "Full article text could not be extracted." };
};

/**
 * Gets the current date in YYYYMMDD format for the URL.
 * @returns The formatted date string.
 */
const getTodaysDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};
/**
 * Fetches the top 10 articles from the Supabase database.
 * @returns A promise that resolves to an array of Article objects.
 */
export const fetchTopStories = async (): Promise<Article[]> => {
  try {
    const dateString = getTodaysDateString();
    const GITHUB_RAW_URL = `https://raw.githubusercontent.com/djangamane/soWSnewsletter/main/docs/full_articles_${dateString}.json`;

    const response = await fetch(GITHUB_RAW_URL);

    if (!response.ok) {
      throw new Error(
        `Network response was not ok fetching from GitHub: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.articles)) {
      throw new Error(
        "Fetched data is not in the expected format (missing 'articles' array).",
      );
    }

    // Sort articles by severity score (descending) and take the top 10
    const topArticles = data.articles
      .sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0))
      .slice(0, 10);

    // Identify articles that need their full text fetched and get them in one batch
    const articlesToFetch = topArticles.filter(
      (a) => !a.full_text || a.full_text.length < 200,
    );
    const fetchedDetailsMap = await fetchBatchArticleDetails(articlesToFetch);

    const processedArticles: Article[] = topArticles.map(
      (article, index): Article => {
        const realUrl = extractRealUrl(article.url);
        const fetchedDetails = fetchedDetailsMap.get(realUrl);

        // Prioritize fetched text, but fall back gracefully to the text from the JSON file.
        const fullText =
          fetchedDetails?.text && fetchedDetails.text.length > 100
            ? fetchedDetails.text
            : article.full_text || "Full article text could not be extracted.";
        const imageUrl =
          fetchedDetails?.imageUrl ||
          article.image_url ||
          `https://picsum.photos/seed/${encodeURIComponent(article.title || "fallback")}/${600 + index}/400`;

        return {
          id: index + 1, // Using index as ID as none is provided in the source
          title: article.title || "Untitled Article",
          url: article.url,
          imageUrl,
          fullText: fullText,
          // Scale severity (0-100) to our bias score (0-10)
          biasSeverity: (article.severity_score || 0) / 10,
          source: getSourceFromUrl(article.url),
          // Analysis is not included in this source; it will be fetched on-demand.
          analysis: undefined,
        };
      },
    );

    return processedArticles;
  } catch (error) {
    console.error(
      "Error fetching or processing news stories from GitHub:",
      error,
    );
    throw new Error(
      "Could not load news stories. The data source might be unavailable or in an incorrect format.",
    );
  }
};

/**
 * Updates an article in the database with its new analysis.
 * If the article doesn't exist, it will be created.
 * @param article The article object from the frontend.
 * @param analysis The analysis object from the Gemini API.
 */
export const updateArticleAnalysis = async (
  article: Article,
  analysis: ArticleAnalysis,
): Promise<void> => {
  const { error } = await supabase.from("articles").upsert(
    {
      url: article.url, // Use URL as the unique key for upsert
      title: article.title,
      full_text: article.fullText,
      source: article.source,
      image_url: article.imageUrl.startsWith("https://picsum.photos")
        ? null
        : article.imageUrl,
      bias_severity: article.biasSeverity,
      // New analysis fields
      analysis_score: analysis.score,
      analysis_summary: analysis.analysisSummary,
      detected_terms: analysis.detectedTerms,
      keisha_translation: analysis.keishaTranslation,
      analysis_updated_at: new Date().toISOString(),
    },
    { onConflict: "url" },
  );

  if (error) {
    console.error("Error upserting article analysis in Supabase:", error);
  }
};
