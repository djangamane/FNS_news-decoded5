const puppeteer = require('puppeteer');

async function scrapeArticle(url) {
  let browser = null;
  try {
    console.log(`Scraping article from: ${url}`);
    
    // Launch browser with optimized settings for cloud environments
    // With the full 'puppeteer' package, executablePath is handled automatically.
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    };

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to the URL with timeout
    await page.goto(url, { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });

    // Wait for content to load
    await page.waitForSelector('body', { timeout: 10000 });

    // Extract article content using multiple strategies
    const articleData = await page.evaluate(() => {
      // Try to find main article content using common selectors
      const selectors = [
        'article',
        'main',
        '[role="main"]',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.story-content',
        '.content',
        '.main-content',
        '#content'
      ];

      let contentElement = null;
      
      // Try each selector in order
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim().length > 500) {
          contentElement = element;
          break;
        }
      }

      // Fallback: use body if no specific content element found
      if (!contentElement) {
        contentElement = document.body;
      }

      // Remove unwanted elements (ads, navigation, etc.)
      const unwantedSelectors = [
        'nav', 'header', 'footer', 'aside', 
        '.ad', '.advertisement', '.banner',
        '.social-share', '.share-buttons',
        '.comments', '.related-articles',
        'script', 'style', 'iframe'
      ];

      unwantedSelectors.forEach(selector => {
        const elements = contentElement.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });

      // Get clean text content
      const textContent = contentElement.textContent
        .replace(/\s+/g, ' ')
        .trim();

      // Get title
      const title = document.querySelector('h1')?.textContent?.trim() || 
                   document.title || 
                   'Untitled Article';

      // Get image
      const imageElement = document.querySelector('meta[property="og:image"]') || 
                          document.querySelector('meta[name="twitter:image"]') ||
                          document.querySelector('img');
      const imageUrl = imageElement?.content || imageElement?.src || null;

      return {
        title,
        textContent,
        imageUrl
      };
    });

    console.log(`Successfully scraped article from: ${url}`);
    console.log(`Title: ${articleData.title}`);
    console.log(`Content length: ${articleData.textContent.length} characters`);

    return articleData;

  } catch (error) {
    console.error(`Error scraping article from: ${url}`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { 
  scrapeArticle,
};
