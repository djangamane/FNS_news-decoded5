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
 * Fetches the top 10 articles from the Supabase database.
 * @returns A promise that resolves to an array of Article objects.
 */
export const fetchTopStories = async (): Promise<Article[]> => {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("id", { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    if (!data) {
      return [];
    }

    const processedArticles: Article[] = data.map(
      (article: any, index: number): Article => ({
        id: article.id,
        title: article.title || "Untitled Article",
        url: article.source_url,
        imageUrl:
          article.image_url ||
          `https://picsum.photos/seed/${encodeURIComponent(article.title || "fallback")}/${600 + index}/400`,
        fullText:
          article.text_content || "Full article text could not be extracted.",
        biasSeverity: article.bias_severity,
        source: getSourceFromUrl(article.source_url),
        analysis: article.analysis,
      }),
    );

    return processedArticles;
  } catch (error) {
    console.error("Error fetching top stories from Supabase:", error);
    throw new Error(
      "Could not load news stories. The data source might be unavailable.",
    );
  }
};
