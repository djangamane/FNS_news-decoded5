const puppeteer = require("puppeteer");

async function scrapeArticle(url) {
  let browser = null;
  try {
    console.log(`Scraping article from: ${url}`);
    browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const article = await page.evaluate(() => {
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

      let bestElement = null;
      let maxTextLength = 0;

      const elements = document.querySelectorAll("p, div, article");
      for (const element of elements) {
        const textLength = element.innerText.length;
        if (textLength > maxTextLength) {
          maxTextLength = textLength;
          bestElement = element.innerText;
        }
      }

      return {
        title,
        content: bestElement,
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
