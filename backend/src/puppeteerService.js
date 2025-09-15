const puppeteer = require('puppeteer');

async function scrapeArticle(url) {
  let browser = null;
  try {
    browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const article = await page.evaluate(() => {
      const title = document.querySelector('h1')?.innerText;
      const content = document.querySelector('article')?.innerText;
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      const image = document.querySelector('meta[name="image"]')?.getAttribute('content');
      const twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');

      return {
        title,
        content,
        imageUrl: ogImage || image || twitterImage || null,
      };
    });

    return article;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { scrapeArticle };
