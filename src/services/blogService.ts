import { BlogEntry } from "../types";

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
    const publishedAt =
      dateIndex >= 0 && row[dateIndex] ? row[dateIndex].trim() : undefined;
    const newsletter =
      newsletterIndex >= 0 && row[newsletterIndex]
        ? row[newsletterIndex].trim()
        : "";
    const relatedArticles =
      articlesIndex >= 0 && row[articlesIndex] ? row[articlesIndex].trim() : "";

    if (!newsletter && !relatedArticles) {
      continue;
    }

    entries.push({
      id: publishedAt || `entry-${rowIndex}`,
      title: deriveTitle(newsletter, publishedAt),
      newsletter,
      relatedArticles: relatedArticles || undefined,
      publishedAt: publishedAt ?? null,
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
