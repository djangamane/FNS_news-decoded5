const express = require("express");
const { fetchBlogEntries } = require("../blogService");
const { getBlogPostsForFeed } = require("../dbService");
const { buildSitemapXml, buildRssXml } = require("../utils/blogFeeds");

const router = express.Router();

const SITE_URL = (process.env.SITE_URL || "https://fns-news-decoded5.vercel.app").replace(/\/+$/, "");
const SITE_NAME = process.env.SITE_NAME || "Fragile News Source";
const BLOG_TAGLINE =
  process.env.BLOG_TAGLINE ||
  "Ethical AI intelligence briefings from the Fragile News Source.";

/**
 * GET /api/blog
 * Returns blog entries sourced from the daily newsletter sheet.
 */
router.get("/", async (req, res) => {
  try {
    const { limit, refresh } = req.query;

    const numericLimit =
      typeof limit === "string" && limit.length > 0 ? Number(limit) : undefined;
    const forceRefresh = refresh === "true" || refresh === "1";

    const entries = await fetchBlogEntries({
      limit:
        Number.isNaN(numericLimit) || typeof numericLimit !== "number"
          ? undefined
          : numericLimit,
      forceRefresh,
    });

    res.json({
      success: true,
      count: entries.length,
      entries,
    });
  } catch (error) {
    console.error("Failed to load blog entries:", error);
    res.status(500).json({
      success: false,
      error: "Unable to load blog entries from the newsletter source.",
    });
  }
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
