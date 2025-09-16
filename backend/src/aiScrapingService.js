const { GoogleGenerativeAI } = require("@google/generative-ai");
const puppeteer = require("puppeteer");
const puppeteer = require("puppeteer");

// 1. Initialize the Gemini client with the API key from environment variables
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

async function scrapeArticle(url) {
  console.log(`Scraping article from: ${url} using Gemini`);
  let browser = null;

  try {
    // Step 1: Launch Puppeteer to take a screenshot
    console.log("Launching browser to take screenshot...");
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 2000 }); // Taller viewport to capture more content
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    const screenshotBuffer = await page.screenshot({
      type: "jpeg",
      quality: 70,
    });
    console.log("Screenshot taken successfully.");

    // Step 2: Prepare the image and prompt for Gemini
    const imagePart = {
      inlineData: {
        data: screenshotBuffer.toString("base64"),
        mimeType: "image/jpeg",
      },
    };

    const prompt = `
      You are an expert Optical Character Recognition (OCR) and content analysis agent.
      Analyze the provided screenshot of a webpage. Your tasks are:
      1. Identify and transcribe the main title of the article.
      2. Identify and transcribe the full body text of the article. Ignore ads, comments, and navigation menus.
      3. Format the extracted information into a single JSON object. The JSON must be a string inside a markdown code block like this: \`\`\`json\n{...}\n\`\`\`

      The JSON object must have these keys:
      - "title": The main title of the article.
      - "textContent": The full body text of the article.
      - "imageUrl": Set this to null, as you cannot determine the original image URL from a screenshot.
    `;

    // Step 3: Call the Gemini API with the image and prompt
    console.log("Sending screenshot to Gemini for analysis...");
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Step 4: Parse the JSON response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch || !jsonMatch[1]) {
      console.error("Gemini response did not contain a valid JSON block:", text);
      throw new Error("Failed to parse article data from AI response.");
    }
    const articleData = JSON.parse(jsonMatch[1]);

    console.log(
      `Successfully transcribed article: "${articleData.title}", Content length: ${
        articleData.textContent?.length || 0
      }`,
    );

    return articleData;
  } catch (error) {
    console.error(`Error scraping article with Gemini from: ${url}`, error);
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