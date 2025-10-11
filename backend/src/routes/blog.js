const express = require("express");
const { fetchBlogEntries } = require("../blogService");

const router = express.Router();

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

module.exports = router;
