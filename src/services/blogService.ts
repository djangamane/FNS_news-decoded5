import { BlogEntry } from "../types";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3002";

interface FetchBlogOptions {
  limit?: number;
  refresh?: boolean;
}

/**
 * Retrieves newsletter blog entries from the backend.
 * @param options Optional query configuration for the request.
 * @returns Promise resolving to an array of BlogEntry objects.
 */
export const fetchBlogEntries = async (
  options: FetchBlogOptions = {},
): Promise<BlogEntry[]> => {
  const { limit, refresh = false } = options;
  const params = new URLSearchParams();

  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }

  if (refresh) {
    params.set("refresh", "true");
  }

  const query = params.toString();
  const endpoint = `${BACKEND_URL}/api/blog${query ? `?${query}` : ""}`;

  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`Failed to load blog entries (status ${response.status}).`);
  }

  const payload = await response.json();
  const entries = Array.isArray(payload.entries) ? payload.entries : [];

  return entries.map((entry: any, index: number): BlogEntry => ({
    id:
      typeof entry.id === "string"
        ? entry.id
        : entry.publishedAt
          ? String(entry.publishedAt)
          : `entry-${index}`,
    title: entry.title || "Newsletter Update",
    newsletter: entry.newsletter || "",
    relatedArticles: entry.relatedArticles || "",
    publishedAt: entry.publishedAt ?? null,
  }));
};
