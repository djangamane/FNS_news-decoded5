const puppeteer = require("puppeteer");
const { Readability } = require("@mozilla/readability");
const { JSDOM } = require("jsdom");

async function scrapeArticle(url) {
  let browser = null;
  try {
    console.log(`Scraping article from: ${url}`);
    browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const pageContent = await page.content();
    const doc = new JSDOM(pageContent, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    const imageUrl = await page.evaluate(() => {
      const ogImage = document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content");
      const image = document
        .querySelector('meta[name="image"]')
        ?.getAttribute("content");
      const twitterImage = document
        .querySelector('meta[name="twitter:image"]')
        ?.getAttribute("content");
      return ogImage || image || twitterImage || null;
    });

    console.log(`Finished scraping article from: ${url}`);
    return { ...article, imageUrl };
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
