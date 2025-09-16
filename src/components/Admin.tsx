import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Article, ArticleAnalysis } from '../types';
import { decodeArticle, newsService } from '../services';
import DecodeConfirmationDialog from './DecodeConfirmationDialog';

interface AdminProps {
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
}

const Admin: React.FC<AdminProps> = ({ articles, setArticles }) => {
  const [isDecoding, setIsDecoding] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ArticleAnalysis | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleDecode = async (article: Article) => {
    setIsDecoding(article.id);
    setError(null);
    try {
      const result = await decodeArticle(article.fullText);
      setSelectedAnalysis(result);
      setSelectedArticle(article);
    } catch (err) {
      setError('The AI agent failed to decode the article. Please try again.');
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
      const webhookUrl = "https://hook.us2.make.com/3igfwpnqrrwutsawycv1dhrdix9ln2au";
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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedArticles = articles.map((a) =>
        a.id === selectedArticle.id ? { ...a, analysis: selectedAnalysis } : a
      );
      setArticles(updatedArticles);
      await newsService.updateArticleAnalysis(selectedArticle, selectedAnalysis);
      setSelectedAnalysis(null);
      setSelectedArticle(null);
    } catch (err) {
      setError(
        `Failed to send to social media: ${err instanceof Error ? err.message : "Unknown error"}`
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
            onClick={() => navigate('/')}
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
                  {isDecoding === article.id ? 'Decoding...' : 'Decode'}
                </button>
              </div>
            ))}
          </div>
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
