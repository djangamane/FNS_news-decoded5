import { ArticleAnalysis } from "../types";

// The Gemini API key lives on the backend only. Anything prefixed with VITE_ is
// inlined into the client bundle at build time and is readable by any visitor,
// so the model is never called directly from the browser.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3002";

/**
 * Performs a full analysis and translation of an article via the backend.
 * @param articleText The full text of the article to be analyzed.
 * @returns A promise that resolves to a comprehensive ArticleAnalysis object.
 */
export const decodeArticle = async (
  articleText: string,
): Promise<ArticleAnalysis> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/decode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: articleText }),
    });

    if (!response.ok) {
      throw new Error(`Decode request failed with status ${response.status}`);
    }

    return (await response.json()) as ArticleAnalysis;
  } catch (error) {
    console.error("Error decoding article via the backend:", error);
    throw new Error("Failed to get a valid analysis from the AI agent.");
  }
};
