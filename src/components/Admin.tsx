import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Article } from "../types";
import { fetchTopStories } from "../services/newsService";

const Admin: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const webhookUrl =
    "https://hook.us2.make.com/3igfwpnqrrwutsawycv1dhrdix9ln2au";

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stories = await fetchTopStories();
      // Filter articles that have analysis with keisha translation
      const articlesWithAnalysis = stories.filter(
        (article) => article.analysis && article.analysis.keishaTranslation,
      );
      setArticles(articlesWithAnalysis);
    } catch (err) {
      setError("Failed to load articles");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendToSocialMedia = async (article: Article) => {
    if (!article.analysis?.keishaTranslation) {
      setError("No Keisha translation available for this article");
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        title: article.title,
        source: article.source,
        url: article.url,
        keishaTranslation: article.analysis.keishaTranslation,
        biasScore: article.analysis.score,
        analysisSummary: article.analysis.analysisSummary,
        detectedTerms: article.analysis.detectedTerms,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccessMessage(
          `Successfully sent "${article.title}" to social media automation!`,
        );
        setSelectedArticle(null);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      setError(
        `Failed to send to social media: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = () => {
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p>Loading articles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono relative overflow-hidden">
      {/* Matrix Video Background */}
      <video
        className="fixed inset-0 w-full h-full object-cover opacity-30"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/matrix.mp4" type="video/mp4" />
      </video>

      {/* Scan Lines Effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="scan-lines"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-black/80 p-4 rounded-lg border border-green-500/30">
          <h1 className="text-3xl font-bold text-green-400 glow-green">
            Admin Content Creator
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-900/50 border border-green-500 rounded-lg text-green-400">
            {successMessage}
          </div>
        )}

        {/* Article Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Articles List */}
          <div className="bg-black/80 p-6 rounded-lg border border-green-500/30 hologram-card">
            <h2 className="text-2xl font-bold mb-4 text-green-300">
              Articles with Analysis ({articles.length})
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto no-scrollbar">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedArticle?.id === article.id
                      ? "border-green-400 bg-green-900/20"
                      : "border-green-500/30 hover:border-green-400/60"
                  }`}
                  onClick={() => setSelectedArticle(article)}
                >
                  <h3 className="font-semibold text-green-300 mb-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-green-500">
                    Source: {article.source}
                  </p>
                  <p className="text-sm text-green-600">
                    Bias Score: {article.analysis?.score}/100
                  </p>
                </div>
              ))}
              {articles.length === 0 && (
                <p className="text-center text-gray-400">
                  No articles with analysis found. Articles need to be decoded
                  first.
                </p>
              )}
            </div>
          </div>

          {/* Selected Article Preview */}
          <div className="bg-black/80 p-6 rounded-lg border border-green-500/30 hologram-card">
            {selectedArticle ? (
              <div>
                <h2 className="text-2xl font-bold mb-4 text-green-300">
                  Selected Article
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-green-400 mb-2">Title:</h3>
                    <p className="text-green-300">{selectedArticle.title}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-green-400 mb-2">Source:</h3>
                    <p className="text-green-500">{selectedArticle.source}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-green-400 mb-2">
                      Bias Score:
                    </h3>
                    <p className="text-green-500">
                      {selectedArticle.analysis?.score}/100
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-green-400 mb-2">
                      Keisha Translation:
                    </h3>
                    <div className="bg-gray-900/50 p-4 rounded border border-green-500/20 max-h-48 overflow-y-auto no-scrollbar">
                      {selectedArticle.analysis?.keishaTranslation
                        .split("\n")
                        .map((paragraph, index) => (
                          <p key={index} className="text-green-400 mb-2">
                            {paragraph.trim()}
                          </p>
                        ))}
                    </div>
                  </div>
                  <button
                    onClick={() => sendToSocialMedia(selectedArticle)}
                    disabled={
                      isSending || !selectedArticle.analysis?.keishaTranslation
                    }
                    className="w-full mt-4 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold rounded transition-colors"
                  >
                    {isSending ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                        Sending to Social Media...
                      </div>
                    ) : (
                      "Send to Social Media"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <p className="mb-4">
                  Select an article to preview and send to social media
                </p>
                <div className="text-6xl mb-4">📱</div>
                <p className="text-sm">
                  Choose an article from the list to see its Keisha translation
                  and send it to your social media automation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-black/80 p-6 rounded-lg border border-green-500/30 hologram-card">
          <h2 className="text-xl font-bold mb-4 text-green-300">
            Instructions
          </h2>
          <ul className="space-y-2 text-green-400">
            <li>• Select an article from the list to preview its analysis</li>
            <li>• Review the Keisha translation in the preview panel</li>
            <li>
              • Click "Send to Social Media" to trigger your Make automation
            </li>
            <li>
              • The webhook will receive the title, source, Keisha translation,
              bias score, and analysis data
            </li>
            <li>
              • Only articles that have been decoded and analyzed will appear in
              the list
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Admin;
