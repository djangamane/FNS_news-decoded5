const { extract } = require("article-extractor");

async function scrapeArticle(url) {
  try {
    console.log(`Scraping article from: ${url}`);
    const article = await extract(url);
    console.log(`Finished scraping article from: ${url}`);
    return article;
  } catch (error) {
    console.error(`Error scraping article from: ${url}`, error);
    throw error;
  }
}

module.exports = { scrapeArticle };
