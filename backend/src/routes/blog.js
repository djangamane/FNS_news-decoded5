const express = require("express");
const { fetchBlogEntries } = require("../blogService");
const {
  getBlogPostsForFeed,
  upsertNewsletterDraft,
  getNewsletterDrafts,
} = require("../dbService");
const { buildSitemapXml, buildRssXml } = require("../utils/blogFeeds");
const { decodeArticle } = require("../geminiService");

const router = express.Router();

// Set BLOG_INGEST_API_KEY in the backend environment and as a GitHub secret in
// the soWSnewsletter repo. Without it the ingest endpoint refuses every request
// rather than accepting unauthenticated writes.
const INGEST_API_KEY = process.env.BLOG_INGEST_API_KEY;

// Off by default: enabling it spends two Gemini calls per ingested newsletter.
const ENHANCE_ON_INGEST = process.env.BLOG_INGEST_ENHANCE === "true";

const deriveDraftTitle = (newsletter, publishedAt) => {
  const firstLine = (newsletter || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (firstLine) {
    return firstLine.slice(0, 200);
  }

  return publishedAt ? `Newsletter ${publishedAt}` : "Newsletter Update";
};

const SITE_URL = (process.env.SITE_URL || "https://fns-news-decoded5.vercel.app").replace(/\/+$/, "");
const SITE_NAME = process.env.SITE_NAME || "Fragile News Source";
const BLOG_TAGLINE =
  process.env.BLOG_TAGLINE ||
  "Ethical AI intelligence briefings from the Fragile News Source.";

/**
 * POST /api/blog/ingest
 * Receives one day's newsletter from the soWSnewsletter GitHub Action.
 * Authenticated with a shared key so the Action, and only the Action, can write.
 */
router.post("/ingest", async (req, res) => {
  if (!INGEST_API_KEY) {
    console.error("Rejected ingest: BLOG_INGEST_API_KEY is not configured.");
    return res.status(503).json({
      success: false,
      error: "Ingest is not configured on this server.",
    });
  }

  if (req.get("x-api-key") !== INGEST_API_KEY) {
    return res.status(401).json({ success: false, error: "Invalid API key." });
  }

  const { date, newsletter, articles } = req.body || {};

  if (typeof newsletter !== "string" || newsletter.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "A non-empty 'newsletter' field is required.",
    });
  }

  const publishedAt = date ? new Date(date) : new Date();
  if (Number.isNaN(publishedAt.getTime())) {
    return res.status(400).json({
      success: false,
      error: "'date' must be a parseable date.",
    });
  }

  const sourceId = publishedAt.toISOString().slice(0, 10);

  try {
    let content = newsletter;

    if (ENHANCE_ON_INGEST) {
      try {
        const analysis = await decodeArticle(newsletter);
        content = analysis.keishaTranslation || newsletter;
      } catch (enhanceError) {
        // A failed rewrite must not cost us the day's newsletter.
        console.error("Enhancement failed, storing raw newsletter:", enhanceError);
      }
    }

    const draft = await upsertNewsletterDraft({
      sourceId,
      title: deriveDraftTitle(content, sourceId),
      newsletter: content,
      relatedArticles: typeof articles === "string" ? articles : undefined,
      publishedAt: publishedAt.toISOString(),
    });

    console.log(`Ingested newsletter draft for ${sourceId}`);
    res.status(201).json({ success: true, entry: draft });
  } catch (error) {
    console.error("Failed to ingest newsletter draft:", error);
    res.status(500).json({
      success: false,
      error: "Unable to store the newsletter draft.",
    });
  }
});

/**
 * GET /api/blog
 * Returns newsletter drafts pushed by the Action, falling back to the legacy
 * Google Sheet so the endpoint keeps working before the table is provisioned.
 */
router.get("/", async (req, res) => {
  const { limit, refresh } = req.query;

  const numericLimit =
    typeof limit === "string" && limit.length > 0 ? Number(limit) : undefined;
  const resolvedLimit =
    Number.isNaN(numericLimit) || typeof numericLimit !== "number"
      ? undefined
      : numericLimit;
  const forceRefresh = refresh === "true" || refresh === "1";

  let entries = [];
  let source = "database";

  try {
    entries = await getNewsletterDrafts({ limit: resolvedLimit });
  } catch (error) {
    console.error("Failed to read newsletter drafts from the database:", error);
  }

  if (entries.length === 0) {
    try {
      entries = await fetchBlogEntries({ limit: resolvedLimit, forceRefresh });
      source = "sheet";
    } catch (error) {
      console.error("Failed to load blog entries from the sheet:", error);
      return res.status(500).json({
        success: false,
        error: "Unable to load blog entries from the newsletter source.",
      });
    }
  }

  // Surfaced so a dead feed is visible instead of silently serving stale text.
  const newest = entries[0]?.publishedAt ? Date.parse(entries[0].publishedAt) : NaN;
  const staleDays = Number.isNaN(newest)
    ? null
    : Math.floor((Date.now() - newest) / 86400000);

  res.json({
    success: true,
    count: entries.length,
    source,
    staleDays,
    entries,
  });
});

/**
 * GET /api/blog/sitemap.xml
 * Generates an XML sitemap for published blog posts.
 */
router.get("/sitemap.xml", async (req, res) => {
  try {
    const posts = await getBlogPostsForFeed(200);
    const xml = buildSitemapXml(posts, SITE_URL);
    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=600");
    res.send(xml);
  } catch (error) {
    console.error("Failed to generate blog sitemap:", error);
    res.status(500).json({
      success: false,
      error: "Unable to generate blog sitemap at this time.",
    });
  }
});

/**
 * GET /api/blog/rss.xml
 * Generates an RSS feed for published blog posts.
 */
router.get("/rss.xml", async (req, res) => {
  try {
    const posts = await getBlogPostsForFeed(50);
    const xml = buildRssXml(posts, {
      siteUrl: SITE_URL,
      siteName: SITE_NAME,
      description: BLOG_TAGLINE,
    });
    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=600");
    res.send(xml);
  } catch (error) {
    console.error("Failed to generate blog RSS feed:", error);
    res.status(500).json({
      success: false,
      error: "Unable to generate blog RSS feed at this time.",
    });
  }
});

router.get("/feed.xml", (req, res) => {
  res.redirect(302, "/api/blog/rss.xml");
});

module.exports = router;
