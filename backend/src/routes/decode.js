const express = require("express");
const rateLimit = require("express-rate-limit");
const { decodeArticle } = require("../geminiService");

const router = express.Router();

const MAX_TEXT_LENGTH = 100000;

// Each decode costs two Gemini calls, so this route is limited far more
// tightly than the app-wide limiter allows.
const decodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: "Too many decode requests from this IP, please try again later.",
  },
});

router.post("/", decodeLimiter, async (req, res) => {
  const { text } = req.body || {};

  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "A non-empty 'text' field is required." });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(413).json({
      error: `Text exceeds the maximum length of ${MAX_TEXT_LENGTH} characters.`,
    });
  }

  try {
    const analysis = await decodeArticle(text);
    res.json(analysis);
  } catch (error) {
    console.error("Error decoding article with Gemini API:", error);
    res.status(502).json({
      error: "Failed to get a valid analysis from the AI agent.",
    });
  }
});

module.exports = router;
