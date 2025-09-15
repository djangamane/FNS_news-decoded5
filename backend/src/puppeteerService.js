const { GoogleGenerativeAI } = require("@google/generative-ai");

// 1. Initialize the Gemini client with the API key from environment variables
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

async function scrapeArticle(url) {
  console.log(`Scraping article from: ${url} using Gemini`);

  // 2. Use the detailed prompt you designed to instruct the AI
  const prompt = `
    You are a specialized web scraping agent. Your purpose is to navigate to the provided URL, intelligently identify and extract its core content, and return the data in a structured JSON format.

    URL to scrape: ${url}

    Perform the following tasks:
    1.  **Navigate and Prepare:** Navigate to the URL and wait for the page to fully load.
    2.  **Identify Main Content Container:** Find the main HTML element containing the article body. Prioritize selectors like 'article', 'main', '[role="main"]'.
    3.  **Extract Core Data:**
        *   **Title:** Extract the article's title from the H1 or title tag.
        *   **Image URL:** Extract the main image URL from 'og:image' or 'twitter:image' meta tags, or the first large image.
        *   **Text Content:** Extract all text from the main content container.
    4.  **Clean the Text Content:** Remove noisy elements like navs, footers, ads, and comments. Consolidate whitespace.
    5.  **Format and Return:** Return a single JSON object with the keys "title", "textContent", and "imageUrl". The JSON must be a string inside a markdown code block like this: \`\`\`json\n{...}\n\`\`\`
    
    If scraping fails or no meaningful content is found, return a JSON object with null values for the fields.
  `;

  try {
    // 3. Call the model and get the response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 4. Extract the JSON from the model's markdown response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch || !jsonMatch[1]) {
      console.error("Gemini response did not contain a valid JSON block:", text);
      throw new Error("Failed to parse article data from AI response.");
    }

    const articleData = JSON.parse(jsonMatch[1]);

    console.log(`Successfully scraped article from: ${url}`);
    console.log(`Title: ${articleData.title}, Content length: ${articleData.textContent?.length || 0}`);

    return articleData;
  } catch (error) {
    console.error(`Error scraping article with Gemini from: ${url}`, error);
    throw error;
  }
}

module.exports = { 
  scrapeArticle,
};
