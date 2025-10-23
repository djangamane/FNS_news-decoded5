import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import { Article } from "./types";
import { fetchTopStories } from "./services/newsService";
import NewsCarousel from "./components/NewsCarousel";
import ArticleDetail from "./components/ArticleDetail";
import Header from "./components/Header";
import Footer from "./components/Footer";
import LoadingSpinner from "./components/LoadingSpinner";
import Admin from "./components/Admin";
import BlogLayout from "./components/blog/BlogLayout";
import BlogIndex from "./components/blog/BlogIndex";
import BlogPostPage from "./components/blog/BlogPostPage";
import NotFound from "./components/NotFound";

const MainApp: React.FC<{
  articles: Article[];
  selectedArticle: Article | null;
  isInitiallyLoading: boolean;
  error: string | null;
  handleSelectArticle: (article: Article) => void;
  handleBack: () => void;
}> = ({
  articles,
  selectedArticle,
  isInitiallyLoading,
  error,
  handleSelectArticle,
  handleBack,
}) => {
  const renderContent = () => {
    if (isInitiallyLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner message="Loading Stories..." />
        </div>
      );
    }
    if (error) {
      return (
        <p className="text-center text-red-400 bg-red-900/30 p-4 rounded-lg">
          {error}
        </p>
      );
    }
    if (selectedArticle) {
      return <ArticleDetail article={selectedArticle} onBack={handleBack} />;
    }
    if (articles.length > 0) {
      console.log("Rendering NewsCarousel with articles:", articles);
      return (
        <NewsCarousel
          articles={articles}
          onSelectArticle={handleSelectArticle}
        />
      );
    }
    return <p className="text-center text-gray-400">No articles found.</p>;
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col relative overflow-hidden">
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

      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 relative z-10">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isInitiallyLoading, setIsInitiallyLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadStories = useCallback(async () => {
    setIsInitiallyLoading(true);
    setError(null);
    try {
      const topStories = await fetchTopStories();
      setArticles(topStories);
    } catch (err) {
      setError(
        "Could not retrieve news stories. The source repository might be temporarily unavailable or the data format is incorrect.",
      );
      console.error(err);
    } finally {
      setIsInitiallyLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const handleSelectArticle = (article: Article) => {
    setSelectedArticle(article);
  };

  const handleBack = () => {
    setSelectedArticle(null);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <MainApp
            articles={articles}
            selectedArticle={selectedArticle}
            isInitiallyLoading={isInitiallyLoading}
            error={error}
            handleSelectArticle={handleSelectArticle}
            handleBack={handleBack}
          />
        }
      />
      <Route path="/blog" element={<BlogLayout />}>
        <Route index element={<BlogIndex />} />
        <Route path="page/:page" element={<BlogIndex />} />
        <Route path=":slug" element={<BlogPostPage />} />
      </Route>
      <Route
        path="/admin"
        element={<Admin articles={articles} setArticles={setArticles} />}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
