const express = require('express');
const { fetchArticle, fetchArticles } = require('../articleService');

const router = express.Router();

// Single article fetch endpoint
router.get('/fetch', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        error: 'URL parameter is required'
      });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid URL format'
      });
    }

    const article = await fetchArticle(url);

    res.json({
      success: true,
      data: article
    });

  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch article fetch endpoint
router.post('/batch', async (req, res) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({
        error: 'URLs array is required in request body'
      });
    }

    if (urls.length === 0) {
      return res.status(400).json({
        error: 'URLs array cannot be empty'
      });
    }

    if (urls.length > 10) {
      return res.status(400).json({
        error: 'Maximum 10 URLs allowed per batch request'
      });
    }

    // Validate URLs
    for (const url of urls) {
      try {
        new URL(url);
      } catch (error) {
        return res.status(400).json({
          error: `Invalid URL format: ${url}`
        });
      }
    }

    const { results, errors } = await fetchArticles(urls);

    res.json({
      success: true,
      data: {
        articles: results,
        errors: errors
      },
      summary: {
        total: urls.length,
        successful: results.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('Error in batch fetch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Article Fetching Service'
  });
});

module.exports = router;