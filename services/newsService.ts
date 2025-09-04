import { Article, ArticleAnalysis } from '../types';
import { supabase } from './supabaseClient';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

/**
 * Extracts a user-friendly source name from a URL.
 * @param url The full URL of the article.
 * @returns A formatted source name (e.g., 'example.com').
 */
const getSourceFromUrl = (url: string): string => {
    try {
        const hostname = new URL(url).hostname;
        // Remove 'www.' for cleaner presentation
        return hostname.replace(/^www\./, '');
    } catch (error) {
        console.error('Could not parse URL for source:', url);
        return 'Unknown Source';
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
        if (urlObj.hostname === 'www.google.com' && urlObj.pathname === '/url') {
            const realUrl = urlObj.searchParams.get('url');
            return realUrl || url;
        }
        return url;
    } catch (error) {
        return url;
    }
};

/**
 * Fetches the full text of an article from the backend API.
 * @param url The article URL.
 * @param fallbackText Optional fallback text from GitHub JSON.
 * @returns The extracted text or fallback.
 */
const fetchArticleText = async (url: string, fallbackText?: string): Promise<{ text: string; imageUrl?: string }> => {
  const realUrl = extractRealUrl(url);
  const apiUrl = `${BACKEND_URL}/api/articles/fetch?url=${encodeURIComponent(realUrl)}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    if (!result.success || !result.data || !result.data.content) {
      throw new Error('Invalid response from backend API');
    }

    let text = result.data.content;
    // Basic text cleaning
    text = text.replace(/^\s*[\n\t]+/gm, ''); // Remove leading newlines and tabs
    text = text.replace(/[\n\t]+\s*$/gm, ''); // Remove trailing newlines and tabs
    text = text.replace(/[\n\t]{2,}/g, '\n'); // Replace multiple newlines/tabs with single newline
    text = text.replace(/\t/g, ''); // Remove remaining tabs
    text = text.replace(/^\s+|\s+$/gm, ''); // Trim each line
    text = text.replace(/\n\s+/g, '\n'); // Remove spaces after newlines
    text = text.replace(/\s+\n/g, '\n'); // Remove spaces before newlines
    text = text.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
    text = text.trim();

    if (text.length > 100) {
      return { text, imageUrl: result.data.imageUrl };
    } else if (fallbackText && fallbackText.length > 100) {
      return { text: fallbackText };
    }
  } catch (error) {
    console.error(`Error fetching article from backend:`, error);
    // Fallback to provided text if available
    if (fallbackText && fallbackText.trim().length > 0) {
      return { text: fallbackText };
    }
  }

  return { text: 'Full article text could not be extracted.' };
};

/**
 * Gets the current date in YYYYMMDD format for the URL.
 * @returns The formatted date string.
 */
const getTodaysDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
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
        throw new Error(`Network response was not ok fetching from GitHub: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.articles)) {
        throw new Error("Fetched data is not in the expected format (missing 'articles' array).");
    }

    // Sort articles by severity score (descending) and take the top 10
    const topArticles = data.articles
      .sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0))
      .slice(0, 10);

    // Map the raw data to our internal Article type.
    const processedArticles: Article[] = await Promise.all(topArticles.map(async (article, index) => {
      let fullText = article.full_text || '';
      let imageUrl = `https://picsum.photos/seed/${encodeURIComponent(article.title || String(index))}/600/400`; // Default placeholder
      if (!fullText || fullText.length < 200) { // If no full_text or too short, try to fetch it
        const result = await fetchArticleText(article.url, article.full_text);
        fullText = result.text;
        if (result.imageUrl) {
          imageUrl = result.imageUrl;
        }
      }
      return {
        id: index + 1, // Using index as ID as none is provided in the source
        title: article.title || 'Untitled Article',
        url: article.url,
        imageUrl: imageUrl,
        fullText: fullText,
        // Scale severity (0-100) to our bias score (0-10)
        biasSeverity: (article.severity_score || 0) / 10,
        source: getSourceFromUrl(article.url),
        // Analysis is not included in this source; it will be fetched on-demand.
        analysis: undefined,
      };
    }));

    return processedArticles;

  } catch (error) {
    console.error("Error fetching or processing news stories from GitHub:", error);
    throw new Error('Could not load news stories. The data source might be unavailable or in an incorrect format.');
  }
};

/**
 * Updates an article in the database with its new analysis.
 * If the article doesn't exist, it will be created.
 * @param article The article object from the frontend.
 * @param analysis The analysis object from the Gemini API.
 */
export const updateArticleAnalysis = async (article: Article, analysis: ArticleAnalysis): Promise<void> => {
    const { error } = await supabase
        .from('articles')
        .upsert({
            url: article.url, // Use URL as the unique key for upsert
            title: article.title,
            full_text: article.fullText,
            source: article.source,
            image_url: article.imageUrl.startsWith('https://picsum.photos') ? null : article.imageUrl,
            bias_severity: article.biasSeverity,
            // New analysis fields
            analysis_score: analysis.score,
            analysis_summary: analysis.analysisSummary,
            detected_terms: analysis.detectedTerms,
            keisha_translation: analysis.keishaTranslation,
            analysis_updated_at: new Date().toISOString(),
        }, { onConflict: 'url' });

    if (error) {
        console.error('Error upserting article analysis in Supabase:', error);
    }
};