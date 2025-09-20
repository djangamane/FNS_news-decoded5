import React, { useState, useEffect } from "react";
import { Article, ArticleAnalysis } from "../types";
import { decodeArticle, newsService } from "../services";
import AnalysisCard from "./AnalysisCard";

interface ArticleDetailProps {
  article: Article;
  onBack: () => void;
}

const BackIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 mr-2"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
    />
  </svg>
);

const ArticleDetail: React.FC<ArticleDetailProps> = ({ article, onBack }) => {
  const [analysis, setAnalysis] = useState<ArticleAnalysis | null>(null);
  const [isDecoding, setIsDecoding] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getAnalysis = async () => {
      setIsDecoding(true);
      setError(null);
      try {
        const result = await decodeArticle(article.fullText);
        setAnalysis(result);
      } catch (err) {
        setError(
          "The AI agent failed to decode the article. Please try again.",
        );
        console.error(err);
      } finally {
        setIsDecoding(false);
      }
    };

    getAnalysis();
  }, [article.id, article.fullText]);

  const DecoderLoadingState = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-cyan-400 mb-4">
        AI Agent Decoding...
      </h2>
      <div className="bg-gray-700/50 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-600 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-600 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-600 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-600 rounded w-4/5"></div>
      </div>
      <div
        className="bg-gray-700/50 rounded-lg p-6 animate-pulse"
        style={{ animationDelay: "200ms" }}
      >
        <div className="h-6 bg-gray-600 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-600 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-600 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-600 rounded w-4/5"></div>
      </div>
    </div>
  );

  console.log("fullText:", article.fullText);

  return (
    <div className="animate-fade-in-cyber">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center text-green-400 hover:text-green-300 transition-colors glow-green glitch"
      >
        <BackIcon />
        Back to Stories
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Original Article */}
        <div className="lg:col-span-3 hologram-card p-6 rounded-lg neon-border">
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-64 object-cover rounded-md mb-4 border border-green-500/30"
          />
          <h1 className="text-3xl font-bold mb-2 text-green-300 glow-green">
            {article.title}
          </h1>
          <p className="text-sm text-green-500 mb-4">
            Source:{" "}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-300 glow-cyan"
            >
              {article.source}
            </a>
          </p>
          <div className="text-green-400 leading-relaxed">
            <p>{article.fullText}</p>
          </div>
        </div>

        {/* Decoder Results */}
        <div className="lg:col-span-2">
          {isDecoding && <DecoderLoadingState />}
          {error && (
            <div className="text-red-400 bg-red-900/50 p-4 rounded-lg neon-border">
              {error}
            </div>
          )}
          {analysis && (
            <div className="space-y-6 animate-fade-in-cyber">
              <h2 className="text-3xl font-bold text-green-400 glow-green">
                AI Decoder Analysis
              </h2>
              <AnalysisCard title="Analysis Summary">
                <p className="text-lg font-semibold text-green-300 mb-2 glow-cyan">
                  Racial Bias Score: {analysis.score} / 100
                </p>
                <p className="text-green-400">{analysis.analysisSummary}</p>
              </AnalysisCard>
              <AnalysisCard title="Detected Euphemisms">
                <ul className="space-y-3">
                  {analysis.detectedTerms.map((item, index) => (
                    <li key={index}>
                      <strong className="text-green-300 glow-green">
                        "{item.term}"
                      </strong>
                      :{" "}
                      <span className="text-green-500">{item.explanation}</span>
                    </li>
                  ))}
                </ul>
              </AnalysisCard>
              <AnalysisCard title="'Keisha' Translation">
                <div className="prose prose-invert max-w-none text-green-400 leading-relaxed">
                  {analysis.keishaTranslation
                    .split("\n")
                    .filter((p) => p.trim().length > 0)
                    .map((p, i) => (
                      <p key={i} className="mb-4">
                        {p.trim()}
                      </p>
                    ))}
                </div>
              </AnalysisCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticleDetail;
