import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Article, ArticleAnalysis, BlogEntry } from "../types";
import {
  decodeArticle,
  updateArticleAnalysis,
  fetchBlogEntries,
} from "../services";
import DecodeConfirmationDialog from "./DecodeConfirmationDialog";
import LoadingSpinner from "./LoadingSpinner";

const formatBlogDate = (iso?: string | null): string => {
  if (!iso) {
    return "Date unavailable";
  }

  const parsed = Date.parse(iso);

  if (Number.isNaN(parsed)) {
    return iso;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed);
};

const summariseNewsletter = (newsletter: string): string => {
  if (!newsletter) {
    return "No content";
  }

  const lines = newsletter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines[0] || "Newsletter Update";
};

interface AdminProps {
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
}

const Admin: React.FC<AdminProps> = ({ articles, setArticles }) => {
  const [isDecoding, setIsDecoding] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] =
    useState<ArticleAnalysis | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [blogEntries, setBlogEntries] = useState<BlogEntry[]>([]);
  const [selectedBlogEntry, setSelectedBlogEntry] =
    useState<BlogEntry | null>(null);
  const [isLoadingBlog, setIsLoadingBlog] = useState<boolean>(false);
  const [blogError, setBlogError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadBlogEntries = async (
    refresh = false,
    preferredId: string | null = null,
  ) => {
    setBlogError(null);
    setIsLoadingBlog(true);

    try {
      const entries = await fetchBlogEntries({ refresh, limit: 30 });
      setBlogEntries(entries);

      if (!entries.length) {
        setSelectedBlogEntry(null);
        return;
      }

      const nextSelection = preferredId
        ? entries.find((entry) => entry.id === preferredId) ?? entries[0]
        : entries[0];

      setSelectedBlogEntry(nextSelection);
    } catch (err) {
      setBlogError(
        err instanceof Error
          ? err.message
          : "Unable to load newsletter entries.",
      );
    } finally {
      setIsLoadingBlog(false);
    }
  };

  useEffect(() => {
    loadBlogEntries().catch((err) => {
      console.error("Failed to load newsletter feed:", err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDecode = async (article: Article) => {
    setIsDecoding(article.id);
    setError(null);
    try {
      const result = await decodeArticle(article.fullText);
      setSelectedAnalysis(result);
      setSelectedArticle(article);
    } catch (err) {
      setError("The AI agent failed to decode the article. Please try again.");
      console.error(err);
    } finally {
      setIsDecoding(null);
    }
  };

  const handleConfirmSend = async () => {
    if (!selectedAnalysis || !selectedArticle) return;

    setIsSending(true);
    setError(null);

    try {
      const webhookUrl = import.meta.env.VITE_MAKE_WEBHOOK_URL as string;
      const apiKey = import.meta.env.VITE_MAKE_API_KEY as string;

      const payload = {
        title: selectedArticle.title,
        source: selectedArticle.source,
        url: selectedArticle.url,
        keishaTranslation: selectedAnalysis.keishaTranslation,
        biasScore: selectedAnalysis.score,
        analysisSummary: selectedAnalysis.analysisSummary,
        detectedTerms: selectedAnalysis.detectedTerms,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "x-make-apikey": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedArticles = articles.map((a) =>
        a.id === selectedArticle.id ? { ...a, analysis: selectedAnalysis } : a,
      );
      setArticles(updatedArticles);
      await updateArticleAnalysis(selectedArticle, selectedAnalysis);
      setSelectedAnalysis(null);
      setSelectedArticle(null);
    } catch (err) {
      setError(
        `Failed to send to social media: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelSend = () => {
    setSelectedAnalysis(null);
    setSelectedArticle(null);
  };

  const handleRefreshBlog = () => {
    loadBlogEntries(true, selectedBlogEntry ? selectedBlogEntry.id : null).catch(
      (err) => {
        console.error("Failed to refresh newsletter feed:", err);
      },
    );
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono relative overflow-hidden">
      <video
        className="fixed inset-0 w-full h-full object-cover opacity-30"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/matrix.mp4" type="video/mp4" />
      </video>

      <div className="fixed inset-0 pointer-events-none">
        <div className="scan-lines"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8 bg-black/80 p-4 rounded-lg border border-green-500/30">
          <h1 className="text-3xl font-bold text-green-400 glow-green">
            Admin Dashboard
          </h1>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Back to Main Site
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="bg-black/80 p-6 rounded-lg border border-green-500/30 hologram-card">
          <h2 className="text-2xl font-bold mb-4 text-green-300">
            All Articles ({articles.length})
          </h2>
          <div className="space-y-4">
            {articles.map((article) => (
              <div
                key={article.id}
                className="p-4 border rounded-lg flex justify-between items-center border-green-500/30"
              >
                <h3 className="font-semibold text-green-300">
                  {article.title}
                </h3>
                <button
                  onClick={() => handleDecode(article)}
                  disabled={isDecoding === article.id}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold rounded transition-colors"
                >
                  {isDecoding === article.id ? "Decoding..." : "Decode"}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 bg-black/80 p-6 rounded-lg border border-green-500/30 hologram-card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-green-300">
              Newsletter Blog Feed
            </h2>
            <button
              onClick={handleRefreshBlog}
              disabled={isLoadingBlog}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed text-black font-bold rounded transition-colors"
            >
              {isLoadingBlog ? "Refreshing..." : "Refresh Feed"}
            </button>
          </div>
          {blogError && (
            <div className="mb-4 p-3 bg-red-900/40 border border-red-500/60 rounded text-red-200">
              {blogError}
            </div>
          )}
          {isLoadingBlog && !blogEntries.length ? (
            <div className="flex justify-center items-center h-40">
              <LoadingSpinner message="Loading newsletter entries..." />
            </div>
          ) : blogEntries.length ? (
            <div className="grid gap-6 md:grid-cols-[260px,1fr]">
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                {blogEntries.map((entry) => {
                  const isActive = selectedBlogEntry?.id === entry.id;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedBlogEntry(entry)}
                      className={`w-full text-left px-3 py-2 border rounded transition-colors ${
                        isActive
                          ? "border-green-300 bg-green-900/60 text-green-100"
                          : "border-green-500/30 bg-black/60 text-green-300 hover:bg-green-800/40"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-wide text-green-300/80">
                        {formatBlogDate(entry.publishedAt)}
                      </p>
                      <p className="text-sm font-semibold">
                        {summariseNewsletter(entry.newsletter)}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="bg-black/70 border border-green-500/20 rounded-lg p-4">
                {selectedBlogEntry ? (
                  <>
                    <h3 className="text-xl font-semibold text-green-200 mb-2">
                      {selectedBlogEntry.title}
                    </h3>
                    <p className="text-xs uppercase text-green-300/70 mb-4">
                      {formatBlogDate(selectedBlogEntry.publishedAt)}
                    </p>
                    <pre className="whitespace-pre-wrap text-green-100 text-sm leading-relaxed">
                      {selectedBlogEntry.newsletter}
                    </pre>
                    {selectedBlogEntry.relatedArticles ? (
                      <div className="mt-4">
                        <h4 className="text-lg font-semibold text-green-200 mb-2">
                          Referenced Articles
                        </h4>
                        <ul className="list-disc list-inside text-green-100 text-sm space-y-1">
                          {selectedBlogEntry.relatedArticles
                            .split(/\r?\n/)
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-green-200">
                    Select a newsletter entry to view its content.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-black/60 border border-green-500/20 rounded text-green-200">
              No newsletter entries found.
            </div>
          )}
        </div>
      </div>

      {selectedAnalysis && (
        <DecodeConfirmationDialog
          analysis={selectedAnalysis}
          onConfirm={handleConfirmSend}
          onCancel={handleCancelSend}
          isSending={isSending}
        />
      )}
    </div>
  );
};

export default Admin;
