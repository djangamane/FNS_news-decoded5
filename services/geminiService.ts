
import { GoogleGenAI, Type } from "@google/genai";
import { ArticleAnalysis } from '../types';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.INTEGER,
      description: "A score from 0-100 indicating the level of detected racial bias based on the specified framework. Higher score means more bias."
    },
    detected_terms: {
      type: Type.ARRAY,
      description: "An array of terms detected in the text that are considered euphemisms.",
      items: {
        type: Type.OBJECT,
        properties: {
          term: {
            type: Type.STRING,
            description: "The euphemistic term found in the text."
          },
          explanation: {
            type: Type.STRING,
            description: "A brief explanation of why this term is considered a euphemism in the context of white supremacy."
          }
        },
        required: ["term", "explanation"]
      }
    },
    analysis_summary: {
      type: Type.STRING,
      description: "A detailed summary of the analysis, written in the style of Dr. Francis Cress Welsing or Dr. Amos Wilson. It should be direct, unflinching, and focus on how the language used serves to protect white supremacy from examination."
    }
  },
  required: ["score", "detected_terms", "analysis_summary"]
};

// Internal function for structured analysis
const _analyzeArticle = async (text: string): Promise<{ score: number; detected_terms: { term: string; explanation: string; }[]; analysis_summary: string; }> => {
  const model = "gemini-2.5-flash";
  const systemInstruction = `You are an AI assistant specializing in critical race theory, specifically the frameworks of Dr. Francis Cress Welsing and Dr. Amos Wilson. Your purpose is to detect 'white fragility' and linguistic euphemisms in text that protect white supremacy from examination. 
  Analyze the provided text. Identify terms such as 'racism', 'colonialism', 'imperialism', 'far right', 'nazi', 'neo nazi', 'systemic racism', 'maga', 'christian nationalism', 'domestic terrorism', 'social justice', 'racial equity', 'reverse racism'. Explain how these terms misdirect from the root cause analysis of white supremacy. 
  Based on the frequency and context of these terms, provide a 'Racial Bias Score' from 0 (no bias detected) to 100 (saturated with bias). Your analysis must be direct and unflinching.
  You MUST return your response in the specified JSON format.`;

  const response = await ai.models.generateContent({
    model,
    contents: text,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: analysisSchema
    }
  });
  const jsonText = response.text.trim();
  return JSON.parse(jsonText);
};

// Internal function for the "Keisha Translation"
const _translateArticle = async (text: string): Promise<string> => {
  const model = "gemini-2.5-flash";
  const systemInstruction = `You are an AI critic named 'Keisha'. Your function is to provide the 'Keisha Translation', a scathing, journalistic critique of the provided article. Adopt the analytical frameworks of Dr. Francis Cress Welsing and Dr. Amos Wilson, combined with the sharp, direct, and unapologetic rhetorical style of a figure like Rep. Jasmine Crockett.
    Do not simply replace words. Instead, rewrite the article to expose its underlying meaning, dismantling its euphemisms and directly confronting the white supremacist logic it conceals. Your tone should be that of a powerful, incisive political commentator revealing the truth behind the headlines. 
    The output must be ONLY the full, rewritten article in this critical style.`;

  const response = await ai.models.generateContent({
    model,
    contents: text,
    config: {
      systemInstruction: systemInstruction,
    }
  });
  return response.text.trim();
};

/**
 * Performs a full analysis and translation of an article.
 * @param articleText The full text of the article to be analyzed.
 * @returns A promise that resolves to a comprehensive ArticleAnalysis object.
 */
export const decodeArticle = async (articleText: string): Promise<ArticleAnalysis> => {
  try {
    // Run both API calls in parallel for efficiency
    const [analysisResult, keishaTranslation] = await Promise.all([
      _analyzeArticle(articleText),
      _translateArticle(articleText)
    ]);

    // Map the results to our application's ArticleAnalysis type
    return {
      score: analysisResult.score,
      analysisSummary: analysisResult.analysis_summary,
      detectedTerms: analysisResult.detected_terms,
      keishaTranslation: keishaTranslation,
    };
  } catch (error) {
    console.error("Error decoding article with Gemini API:", error);
    throw new Error("Failed to get a valid analysis from the AI agent.");
  }
};
