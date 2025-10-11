const axios = require("axios");

const BLOG_CACHE_TTL_MS = Number(process.env.BLOG_CACHE_TTL_MS || 15 * 60 * 1000);

const cacheState = {
  expiresAt: 0,
  entries: null,
};

/**
 * Normalises a Google Sheets sharing link into a CSV export endpoint.
 * @param {string} rawUrl
 * @returns {string}
 */
function buildCsvUrl(rawUrl) {
  if (!rawUrl) {
    return rawUrl;
  }

  if (rawUrl.includes("/export")) {
    return rawUrl;
  }

  const url = new URL(rawUrl);
  const pathSegments = url.pathname.split("/");
  const spreadsheetIdIndex = pathSegments.findIndex((segment) => segment === "d");

  if (spreadsheetIdIndex === -1 || spreadsheetIdIndex + 1 >= pathSegments.length) {
    return rawUrl;
  }

  const spreadsheetId = pathSegments[spreadsheetIdIndex + 1];
  const base = `${url.protocol}//${url.host}/spreadsheets/d/${spreadsheetId}/export?format=csv`;

  if (url.searchParams.has("gid")) {
    return `${base}&gid=${url.searchParams.get("gid")}`;
  }

  return base;
}

/**
 * Lightweight CSV parser that supports quoted fields, escaped quotes,
 * and multi-line fields.
 * @param {string} csvText
 * @returns {string[][]}
 */
function parseCsv(csvText) {
  const rows = [];
  let currentField = "";
  let currentRow = [];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

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

    if ((char === "\r" || char === "\n") && !inQuotes) {
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
}

/**
 * Converts parsed CSV rows into structured blog entries.
 * @param {string[][]} rows
 * @returns {object[]}
 */
function transformRows(rows) {
  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const dateIndex = headers.indexOf("date");
  const newsletterIndex = headers.indexOf("newsletter");
  const articlesIndex = headers.indexOf("articles");

  const entries = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];

    const publishedAt = dateIndex >= 0 ? row[dateIndex]?.trim() : null;
    const newsletter = newsletterIndex >= 0 ? row[newsletterIndex]?.trim() : "";
    const articles = articlesIndex >= 0 ? row[articlesIndex]?.trim() : "";

    if (!newsletter && !articles) {
      continue;
    }

    const title = deriveTitle(newsletter, publishedAt);

    entries.push({
      id: publishedAt || `entry-${rowIndex}`,
      title,
      newsletter,
      relatedArticles: articles,
      publishedAt,
    });
  }

  return entries.sort((a, b) => {
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bTime - aTime;
  });
}

/**
 * Determines a display title for a newsletter entry based on its content.
 * @param {string} newsletter
 * @param {string | null} publishedAt
 * @returns {string}
 */
function deriveTitle(newsletter, publishedAt) {
  if (newsletter) {
    const lines = newsletter
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length) {
      return lines[0];
    }
  }

  if (publishedAt) {
    return new Date(publishedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return "Newsletter Update";
}

/**
 * Fetches blog entries from the configured Google Sheet CSV,
 * leveraging a simple in-memory cache to reduce rounds trips.
 * @param {{ forceRefresh?: boolean, limit?: number }} options
 * @returns {Promise<object[]>}
 */
async function fetchBlogEntries(options = {}) {
  const { forceRefresh = false, limit } = options;
  const now = Date.now();

  if (!forceRefresh && cacheState.entries && now < cacheState.expiresAt) {
    if (typeof limit === "number") {
      return cacheState.entries.slice(0, limit);
    }
    return cacheState.entries;
  }

  const rawUrl =
    process.env.BLOG_NEWSLETTER_URL ||
    process.env.BLOG_CSV_URL ||
    process.env.NEWSLETTER_SHEET_URL ||
    "https://docs.google.com/spreadsheets/d/1CDALlD2V_Rm_cSaabZCEVIa2LMpV48IsOXrdFQ8lR5E/export?format=csv";

  const csvUrl = buildCsvUrl(rawUrl);

  if (!csvUrl) {
    throw new Error(
      "Blog newsletter URL is not configured. Please set BLOG_NEWSLETTER_URL to a shareable Google Sheets link.",
    );
  }

  const response = await axios.get(csvUrl, {
    responseType: "text",
  });

  const parsed = parseCsv(response.data);
  const entries = transformRows(parsed);

  cacheState.entries = entries;
  cacheState.expiresAt = now + BLOG_CACHE_TTL_MS;

  if (typeof limit === "number") {
    return entries.slice(0, limit);
  }

  return entries;
}

module.exports = {
  fetchBlogEntries,
};
