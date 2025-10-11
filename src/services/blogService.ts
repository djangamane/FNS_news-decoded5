import { BlogEntry, BlogPost } from "../types";
import { supabase } from "./supabaseClient";

const DEFAULT_NEWSLETTER_URL =
  "https://docs.google.com/spreadsheets/d/1CDALlD2V_Rm_cSaabZCEVIa2LMpV48IsOXrdFQ8lR5E/export?format=csv";

const BLOG_NEWSLETTER_URL =
  import.meta.env.VITE_BLOG_NEWSLETTER_URL || DEFAULT_NEWSLETTER_URL;

const BLOG_CACHE_TTL_MS = Number(
  import.meta.env.VITE_BLOG_CACHE_TTL_MS || 15 * 60 * 1000,
);

interface FetchBlogOptions {
  limit?: number;
  refresh?: boolean;
}

interface BlogCacheState {
  entries: BlogEntry[] | null;
  expiresAt: number;
}

const cacheState: BlogCacheState = {
  entries: null,
  expiresAt: 0,
};

const generateFallbackId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `blog-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normaliseSpreadsheetUrl = (rawUrl: string): string => {
  if (!rawUrl) {
    return rawUrl;
  }

  if (rawUrl.includes("/export")) {
    return rawUrl;
  }

  const url = new URL(rawUrl);
  const parts = url.pathname.split("/");
  const spreadsheetIndex = parts.findIndex((segment) => segment === "d");

  if (spreadsheetIndex === -1 || spreadsheetIndex + 1 >= parts.length) {
    return rawUrl;
  }

  const spreadsheetId = parts[spreadsheetIndex + 1];
  const base = `${url.protocol}//${url.host}/spreadsheets/d/${spreadsheetId}/export?format=csv`;

  if (url.searchParams.has("gid")) {
    return `${base}&gid=${url.searchParams.get("gid")}`;
  }

  return base;
};

const parseCsv = (csv: string): string[][] => {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
};

const deriveTitle = (newsletter: string, publishedAt?: string | null): string => {
  const lines = newsletter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 0) {
    return lines[0];
  }

  if (publishedAt) {
    const parsed = Date.parse(publishedAt);
    if (!Number.isNaN(parsed)) {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(parsed);
    }
  }

  return "Newsletter Update";
};

const MONTH_NAMES =
  "(January|February|March|April|May|June|July|August|September|October|November|December)";

const monthNameDatePattern = new RegExp(
  `${MONTH_NAMES}\\s+\\d{1,2},\\s+\\d{4}`,
  "i",
);
const numericDatePattern = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/;
const isoDatePattern = /\b\d{4}-\d{2}-\d{2}\b/;

const normalizeDateString = (input: string): string | null => {
  const parsed = Date.parse(input);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
};

const extractDateFromNewsletter = (newsletter: string): string | null => {
  const lines = newsletter.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const monthMatch = line.match(monthNameDatePattern);
    if (monthMatch) {
      const iso = normalizeDateString(monthMatch[0]);
      if (iso) {
        return iso;
      }
    }

    const isoMatch = line.match(isoDatePattern);
    if (isoMatch) {
      const iso = normalizeDateString(isoMatch[0]);
      if (iso) {
        return iso;
      }
    }

    const numericMatch = line.match(numericDatePattern);
    if (numericMatch) {
      const candidate = numericMatch[0];
      const normalized = candidate.length === 8 && candidate.indexOf("/") === 1
        ? candidate
        : candidate;
      const iso = normalizeDateString(normalized);
      if (iso) {
        return iso;
      }
    }
  }
  return null;
};

const convertRowsToEntries = (rows: string[][]): BlogEntry[] => {
  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const dateIndex = headers.indexOf("date");
  const newsletterIndex = headers.indexOf("newsletter");
  const articlesIndex = headers.indexOf("articles");

  const entries: BlogEntry[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const initialPublishedAt =
      dateIndex >= 0 && row[dateIndex] ? row[dateIndex].trim() : "";
    const newsletter =
      newsletterIndex >= 0 && row[newsletterIndex]
        ? row[newsletterIndex].trim()
        : "";
    const relatedArticles =
      articlesIndex >= 0 && row[articlesIndex] ? row[articlesIndex].trim() : "";

    if (!newsletter && !relatedArticles) {
      continue;
    }

    const derivedPublishedAt =
      normalizeDateString(initialPublishedAt) ||
      extractDateFromNewsletter(newsletter);

    entries.push({
      id: derivedPublishedAt || `entry-${rowIndex}`,
      title: deriveTitle(newsletter, derivedPublishedAt),
      newsletter,
      relatedArticles: relatedArticles || undefined,
      publishedAt: derivedPublishedAt,
    });
  }

  return entries.sort((a, b) => {
    const timeA = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const timeB = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return timeB - timeA;
  });
};

/**
 * Retrieves newsletter blog entries directly from the shared Google Sheet CSV.
 * Performs lightweight client-side caching to reduce network calls.
 */
export const fetchBlogEntries = async (
  options: FetchBlogOptions = {},
): Promise<BlogEntry[]> => {
  const { limit, refresh = false } = options;
  const now = Date.now();

  if (!refresh && cacheState.entries && now < cacheState.expiresAt) {
    return typeof limit === "number"
      ? cacheState.entries.slice(0, limit)
      : cacheState.entries;
  }

  const csvUrl = normaliseSpreadsheetUrl(BLOG_NEWSLETTER_URL);

  const response = await fetch(csvUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to download newsletter CSV (status ${response.status}).`,
    );
  }

  const csvText = await response.text();
  const rows = parseCsv(csvText);
  const entries = convertRowsToEntries(rows);

  cacheState.entries = entries;
  cacheState.expiresAt = now + BLOG_CACHE_TTL_MS;

  return typeof limit === "number" ? entries.slice(0, limit) : entries;
};

const BLOG_POSTS_TABLE = "blog_posts";

const mapBlogPost = (record: any): BlogPost => ({
  id:
    typeof record.id === "string"
      ? record.id
      : record.source_id || record.published_at || generateFallbackId(),
  sourceId: record.source_id || record.id,
  title: record.title || "Newsletter Update",
  content: record.content || "",
  relatedArticles: record.related_articles ?? undefined,
  publishedAt: record.published_at || record.created_at || new Date().toISOString(),
  createdAt: record.created_at ?? undefined,
  updatedAt: record.updated_at ?? undefined,
});

export const fetchPublishedBlogPosts = async (): Promise<BlogPost[]> => {
  const { data, error } = await supabase
    .from(BLOG_POSTS_TABLE)
    .select("*")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Failed to load published blog posts from Supabase:", error);
    if ((error as { code?: string }).code === "42P01") {
      throw new Error(
        "Blog posts table not found. Please create the 'blog_posts' table in Supabase.",
      );
    }
    throw new Error("Unable to load published blog posts.");
  }

  if (!data) {
    return [];
  }

  return data.map(mapBlogPost);
};

interface UpsertBlogPayload {
  sourceId: string;
  title: string;
  content: string;
  relatedArticles?: string | null;
  publishedAt: string;
}

export const upsertBlogPost = async (
  payload: UpsertBlogPayload,
): Promise<BlogPost> => {
  const { data, error } = await supabase
    .from(BLOG_POSTS_TABLE)
    .upsert(
      {
        source_id: payload.sourceId,
        title: payload.title,
        content: payload.content,
        related_articles: payload.relatedArticles ?? null,
        published_at: payload.publishedAt,
      },
      { onConflict: "source_id" },
    )
    .select()
    .single();

  if (error) {
    console.error("Failed to upsert blog post:", error);
    const errorCode = (error as { code?: string }).code;
    if (errorCode === "42P01") {
      throw new Error(
        "Blog posts table not found. Please create the 'blog_posts' table in Supabase.",
      );
    }
    throw new Error(error.message || "Unable to publish blog post.");
  }

  if (!data) {
    throw new Error("No data returned after blog post upsert.");
  }

  return mapBlogPost(data);
};
