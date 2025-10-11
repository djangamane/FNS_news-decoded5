import React, { useEffect, useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import LoadingSpinner from "./LoadingSpinner";
import { BlogPost } from "../types";
import { fetchPublishedBlogPosts } from "../services/blogService";

const formatPublishedDate = (isoDate?: string | null): string => {
  if (!isoDate) {
    return "Date unavailable";
  }

  const parsed = Date.parse(isoDate);

  if (Number.isNaN(parsed)) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed);
};

const extractSummary = (content: string): string => {
  if (!content) {
    return "No summary available.";
  }

  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)[0];

  return firstLine || "Daily Newsletter";
};

const Blog: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const requestPosts = async (
    refresh = false,
    preferredPostId: string | null = null,
  ) => {
    setError(null);

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const blogPosts = await fetchPublishedBlogPosts();

      setPosts(blogPosts);

      if (!blogPosts.length) {
        setSelectedPost(null);
        return;
      }

      const nextSelection = preferredPostId
        ? blogPosts.find((post) => post.id === preferredPostId) ??
          blogPosts[0]
        : blogPosts[0];

      setSelectedPost(nextSelection);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load published blog posts.",
      );
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    requestPosts().catch((err) => {
      console.error("Unable to load published blog posts:", err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    requestPosts(true, selectedPost ? selectedPost.id : null).catch(
      (err) => {
        console.error("Unable to refresh blog posts:", err);
      },
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner message="Loading newsletter archives..." />
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-300">
          {error}
        </div>
      );
    }

    if (!posts.length) {
      return (
        <div className="p-6 bg-black/70 border border-green-500/30 rounded-lg text-center text-green-200">
          No blog posts have been published yet. Check back soon.
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-[280px,1fr]">
        <aside className="bg-black/70 border border-green-500/30 rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-green-300">Archives</h2>
            <button
              onClick={handleRefresh}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-black font-semibold rounded transition-colors disabled:bg-gray-600 disabled:text-gray-300"
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {posts.map((post) => {
              const isActive = selectedPost?.id === post.id;
              return (
                <li key={post.id}>
                  <button
                    onClick={() => setSelectedPost(post)}
                    className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                      isActive
                        ? "border-green-400 bg-green-900/60 text-green-100"
                        : "border-green-500/30 bg-black/60 text-green-300 hover:bg-green-800/40"
                    }`}
                  >
                    <p className="text-sm uppercase tracking-wide text-green-300/80">
                      {formatPublishedDate(post.publishedAt)}
                    </p>
                    <p className="text-base font-semibold truncate">
                      {extractSummary(post.content)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        <section className="bg-black/70 border border-green-500/30 rounded-lg p-6 hologram-card">
          {selectedPost ? (
            <>
              <h1 className="text-3xl font-bold text-green-300 glow-green mb-2">
                {selectedPost.title}
              </h1>
              <p className="text-sm text-green-200/80 mb-6 uppercase tracking-wide">
                {formatPublishedDate(selectedPost.publishedAt)}
              </p>
              <div className="space-y-6">
                <div className="bg-black/60 border border-green-500/20 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-green-100 font-mono text-sm leading-relaxed">
                    {selectedPost.content}
                  </pre>
                </div>
                {selectedPost.relatedArticles ? (
                  <div className="bg-black/60 border border-green-500/20 rounded-lg p-4">
                    <h2 className="text-xl font-semibold text-green-300 mb-2">
                      Referenced Articles
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-green-100 text-sm">
                      {selectedPost.relatedArticles
                        .split(/\r?\n/)
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-green-200">
              Select a post to view the published content.
            </p>
          )}
        </section>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col relative overflow-hidden">
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

      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 relative z-10">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
