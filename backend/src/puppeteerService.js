const puppeteer = require("puppeteer");

async function scrapeArticle(url) {
  let browser = null;
  try {
    console.log(`Scraping article from: ${url}`);
    browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const article = await page.evaluate(() => {
      const selectors = [
        "article",
        '[role="main"]',
        "#main",
        "#content",
        ".post-content",
        ".entry-content",
        ".article-body",
        ".story-body",
      ];

      let mainContent = null;
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          mainContent = element.innerText;
          break;
        }
      }

      const title = document.querySelector("h1")?.innerText;
      const ogImage = document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content");
      const image = document
        .querySelector('meta[name="image"]')
        ?.getAttribute("content");
      const twitterImage = document
        .querySelector('meta[name="twitter:image"]')
        ?.getAttribute("content");

      return {
        title,
        content: mainContent,
        imageUrl: ogImage || image || twitterImage || null,
      };
    });

    console.log(`Finished scraping article from: ${url}`);
    return article;
  } catch (error) {
    console.error(`Error scraping article from: ${url}`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { scrapeArticle };
