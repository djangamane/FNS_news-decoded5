const { GoogleGenAI, Type } = require("@google/genai");

// The API key stays on the server. It must never be exposed to the browser via
// a VITE_-prefixed variable, because Vite inlines those into the client bundle.
//
// The client is built on first use rather than at import time: throwing here
// would take down the whole server, including the blog and ingest routes, just
// because one optional key is absent.
let aiClient = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

const MODEL = "gemini-3.6-flash";

// The API answers spikes in demand with 503, and quota pressure with 429.
// Both clear on their own, so a decode should wait rather than fail the
// request: without this the whole call fails on the first busy moment.
const TRANSIENT_PATTERN = /\b(503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|overloaded)\b/i;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(label, run) {
  let lastError;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const transient = TRANSIENT_PATTERN.test(String(error?.message ?? error));

      if (!transient || attempt === MAX_ATTEMPTS - 1) {
        throw error;
      }

      const delay = BASE_BACKOFF_MS * 2 ** attempt;
      console.warn(`${label}: transient error, retrying in ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.INTEGER,
      description:
        "A score from 0-100 indicating the level of detected racial bias based on the specified framework. Higher score means more bias.",
    },
    detected_terms: {
      type: Type.ARRAY,
      description:
        "An array of terms detected in the text that are considered euphemisms.",
      items: {
        type: Type.OBJECT,
        properties: {
          term: {
            type: Type.STRING,
            description: "The euphemistic term found in the text.",
          },
          explanation: {
            type: Type.STRING,
            description:
              "A brief explanation of why this term is considered a euphemism in the context of white supremacy.",
          },
        },
        required: ["term", "explanation"],
      },
    },
    analysis_summary: {
      type: Type.STRING,
      description:
        "A detailed summary of the analysis, written in the style of Dr. Francis Cress Welsing or Dr. Amos Wilson. It should be direct, unflinching, and focus on how the language used serves to protect white supremacy from examination.",
    },
  },
  required: ["score", "detected_terms", "analysis_summary"],
};

const ANALYSIS_SYSTEM_INSTRUCTION = `You are an AI assistant specializing in critical race theory, specifically the frameworks of Dr. Francis Cress Welsing and Dr. Amos Wilson. Your purpose is to detect 'white fragility' and linguistic euphemisms in text that protect white supremacy from examination.
  Analyze the provided text. Identify terms such as 'racism', 'colonialism', 'imperialism', 'far right', 'nazi', 'neo nazi', 'systemic racism', 'maga', 'christian nationalism', 'domestic terrorism', 'social justice', 'racial equity', 'reverse racism'. Explain how these terms misdirect from the root cause analysis of white supremacy.
  Based on the frequency and context of these terms, provide a 'Racial Bias Score' from 0 (no bias detected) to 100 (saturated with bias). Your analysis must be direct and unflinching.
  You MUST return your response in the specified JSON format.`;

const TRANSLATION_SYSTEM_INSTRUCTION = `You are an AI critic named 'Keisha'. Your function is to provide the 'Keisha Translation', a scathing, journalistic critique of the provided article. Adopt the analytical frameworks of Dr. Francis Cress Welsing and Dr. Amos Wilson, combined with the sharp, direct, and unapologetic rhetorical style of a figure like Rep. Jasmine Crockett.
    Do not simply replace words. Instead, rewrite the article to expose its underlying meaning, dismantling its euphemisms and directly confronting the white supremacist logic it conceals. Your tone should be that of a powerful, incisive political commentator revealing the truth behind the headlines.
    The output must be ONLY the full, rewritten article in this critical style.`;

async function analyseArticle(text) {
  const response = await withRetry("analyseArticle", () =>
    getClient().models.generateContent({
      model: MODEL,
      contents: text,
      config: {
        systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    }),
  );
  return JSON.parse(response.text.trim());
}

async function translateArticle(text) {
  const response = await withRetry("translateArticle", () =>
    getClient().models.generateContent({
      model: MODEL,
      contents: text,
      config: {
        systemInstruction: TRANSLATION_SYSTEM_INSTRUCTION,
      },
    }),
  );
  return response.text.trim();
}

/**
 * Runs the bias analysis and the "Keisha Translation" for a piece of text.
 * @param {string} articleText
 * @returns {Promise<{score: number, analysisSummary: string, detectedTerms: {term: string, explanation: string}[], keishaTranslation: string}>}
 */
async function decodeArticle(articleText) {
  const [analysisResult, keishaTranslation] = await Promise.all([
    analyseArticle(articleText),
    translateArticle(articleText),
  ]);

  return {
    score: analysisResult.score,
    analysisSummary: analysisResult.analysis_summary,
    detectedTerms: analysisResult.detected_terms,
    keishaTranslation,
  };
}

module.exports = { decodeArticle };
