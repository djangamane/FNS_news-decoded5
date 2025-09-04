const express = require('express');
const basicAuth = require('express-basic-auth');
const { fetchArticles } = require('../articleService');

const router = express.Router();

// Basic auth middleware
const adminAuth = basicAuth({
  users: { 'admin': process.env.ADMIN_PASSWORD || 'defaultpassword' }, // Use env var for password
  challenge: true,
  realm: 'Admin Area'
});

// Apply auth to all admin routes
router.use(adminAuth);

// Manual trigger to refetch articles
router.post('/trigger-fetch', async (req, res) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        error: 'URLs array is required and cannot be empty'
      });
    }

    if (urls.length > 10) {
      return res.status(400).json({
        error: 'Maximum 10 URLs allowed per request'
      });
    }

    // Validate URLs
    for (const url of urls) {
      try {
        new URL(url);
      } catch (error) {
        return res.status(400).json({
          error: `Invalid URL: ${url}`
        });
      }
    }

    const { results, errors } = await fetchArticles(urls);

    res.json({
      success: true,
      message: 'Articles fetched successfully',
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
    console.error('Error in manual fetch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get system status
router.get('/status', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Admin Panel',
    authenticated: true
  });
});

module.exports = router;