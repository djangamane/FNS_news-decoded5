import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Article, ArticleAnalysis, BlogEntry, BlogPost } from "../types";
import {
  decodeArticle,
  updateArticleAnalysis,
  fetchBlogEntries,
  fetchPublishedBlogPosts,
  upsertBlogPost,
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
  const [publishedPosts, setPublishedPosts] = useState<BlogPost[]>([]);
  const [isLoadingPublished, setIsLoadingPublished] =
    useState<boolean>(false);
  const [selectedPublishedPost, setSelectedPublishedPost] =
    useState<BlogPost | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>("");
  const [editedContent, setEditedContent] = useState<string>("");
  const [editedRelatedArticles, setEditedRelatedArticles] =
    useState<string>("");
  const [isPublishingBlog, setIsPublishingBlog] = useState<boolean>(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const navigate = useNavigate();

  const resetPublishAlerts = () => {
    setPublishMessage(null);
    setPublishError(null);
  };

  const applyEntryToEditor = (
    entry: BlogEntry,
    publishedOverride?: BlogPost | null,
  ) => {
    const override = publishedOverride ?? null;
    setSelectedPublishedPost(override);
    setEditedTitle(override?.title || entry.title || "Newsletter Update");
    setEditedContent(override?.content || entry.newsletter || "");
    setEditedRelatedArticles(
      override?.relatedArticles || entry.relatedArticles || "",
    );
  };

  function handleSelectBlogEntry(entry: BlogEntry) {
    setSelectedBlogEntry(entry);
    const matchingPost = publishedPosts.find(
      (post) => post.sourceId === entry.id,
    );
    applyEntryToEditor(entry, matchingPost);
    resetPublishAlerts();
  }

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

      handleSelectBlogEntry(nextSelection);
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

  const loadPublishedPosts = async (preferredSourceId?: string | null) => {
    setPublishError(null);
    setIsLoadingPublished(true);

    try {
      const posts = await fetchPublishedBlogPosts();
      setPublishedPosts(posts);

      const sourceId = preferredSourceId || selectedBlogEntry?.id || null;

      if (sourceId) {
        const matchingPost = posts.find((post) => post.sourceId === sourceId);
        setSelectedPublishedPost(matchingPost ?? null);
        if (matchingPost && selectedBlogEntry) {
          applyEntryToEditor(selectedBlogEntry, matchingPost);
        }
      }
    } catch (err) {
      setPublishError(
        err instanceof Error
          ? err.message
          : "Unable to load published blog posts.",
      );
    } finally {
      setIsLoadingPublished(false);
    }
  };

  useEffect(() => {
    loadBlogEntries().catch((err) => {
      console.error("Failed to load newsletter feed:", err);
    });
    loadPublishedPosts().catch((err) => {
      console.error("Failed to load published blog posts:", err);
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

      // Webhook sent successfully
      const updatedArticles = articles.map((a) =>
        a.id === selectedArticle.id ? { ...a, analysis: selectedAnalysis } : a,
      );
      setArticles(updatedArticles);

      try {
        await updateArticleAnalysis(selectedArticle, selectedAnalysis);
        setSelectedAnalysis(null);
        setSelectedArticle(null);
      } catch (dbError) {
        console.error("Failed to save analysis to DB:", dbError);
        // We don't block the success flow, but we warn the user
        setError(
          `Social media post sent successfully, but failed to save analysis to database: ${dbError instanceof Error ? dbError.message : "Unknown error"}`,
        );
        // Keep the dialog open so they see the error, or close it?
        // Let's close it but maybe show a toast? For now, setting error keeps it open if we don't clear state.
        // But we want to indicate success of the main action.
        // Let's clear the selection to close the dialog, but maybe show a global alert?
        // The current UI shows error in the main dashboard if 'error' state is set.
        // So we should probably close the dialog and show the error on the dashboard.
        setSelectedAnalysis(null);
        setSelectedArticle(null);
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

  const handleCancelSend = () => {
    setSelectedAnalysis(null);
    setSelectedArticle(null);
  };

  const handleRefreshBlog = () => {
    resetPublishAlerts();
    loadBlogEntries(true, selectedBlogEntry ? selectedBlogEntry.id : null).catch(
      (err) => {
        console.error("Failed to refresh newsletter feed:", err);
      },
    );
    loadPublishedPosts(selectedBlogEntry ? selectedBlogEntry.id : null).catch(
      (err) => {
        console.error("Failed to sync published posts during refresh:", err);
      },
    );
  };

  const handleRefreshPublished = () => {
    resetPublishAlerts();
    loadPublishedPosts(selectedBlogEntry ? selectedBlogEntry.id : null).catch(
      (err) => {
        console.error("Failed to refresh published posts:", err);
      },
    );
  };

  const handleUseDraftContent = () => {
    if (!selectedBlogEntry) {
      return;
    }
    applyEntryToEditor(selectedBlogEntry, null);
    resetPublishAlerts();
  };

  const handleUsePublishedContent = () => {
    if (!selectedBlogEntry || !selectedPublishedPost) {
      return;
    }
    applyEntryToEditor(selectedBlogEntry, selectedPublishedPost);
    resetPublishAlerts();
  };

  const handlePublishBlog = async () => {
    if (!selectedBlogEntry) {
      setPublishError("Select a newsletter entry before publishing.");
      return;
    }

    if (!editedContent.trim()) {
      setPublishError("Blog content cannot be empty.");
      return;
    }

    const sourceId = selectedBlogEntry.id;
    const publishedAtIso = selectedBlogEntry.publishedAt
      ? new Date(selectedBlogEntry.publishedAt).toISOString()
      : new Date().toISOString();

    setIsPublishingBlog(true);
    setPublishMessage(null);
    setPublishError(null);

    try {
      const savedPost = await upsertBlogPost({
        sourceId,
        title:
          editedTitle.trim() || selectedBlogEntry.title || "Newsletter Update",
        content: editedContent.trim(),
        relatedArticles: editedRelatedArticles.trim() || null,
        publishedAt: publishedAtIso,
      });

      setPublishedPosts((prev) => {
        const index = prev.findIndex((post) => post.sourceId === sourceId);
        if (index >= 0) {
          const clone = [...prev];
          clone[index] = savedPost;
          return clone;
        }
        return [savedPost, ...prev];
      });

      applyEntryToEditor(selectedBlogEntry, savedPost);
      setPublishMessage(
        selectedPublishedPost
          ? "Blog post updated successfully."
          : "Blog post published successfully.",
      );
    } catch (err) {
      setPublishError(
        err instanceof Error
          ? err.message
          : "Unable to publish blog post.",
      );
    } finally {
      setIsPublishingBlog(false);
    }
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
                  const isPublished = publishedPosts.some(
                    (post) => post.sourceId === entry.id,
                  );
                  return (
                    <button
                      key={entry.id}
                      onClick={() => handleSelectBlogEntry(entry)}
                      className={`w-full text-left px-3 py-2 border rounded transition-colors ${isActive
                          ? "border-green-300 bg-green-900/60 text-green-100"
                          : "border-green-500/30 bg-black/60 text-green-300 hover:bg-green-800/40"
                        }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-green-300/80">
                            {formatBlogDate(entry.publishedAt)}
                          </p>
                          <p className="text-sm font-semibold">
                            {summariseNewsletter(entry.newsletter)}
                          </p>
                        </div>
                        {isPublished ? (
                          <span className="text-[10px] uppercase tracking-wide font-semibold text-green-200 bg-green-800/80 border border-green-500/60 rounded px-2 py-1">
                            Published
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="bg-black/70 border border-green-500/20 rounded-lg p-4 space-y-4">
                {selectedBlogEntry ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h3 className="text-xl font-semibold text-green-200">
                            Editing: {formatBlogDate(selectedBlogEntry.publishedAt)}
                          </h3>
                          <p className="text-xs uppercase text-green-300/70">
                            Source ID: {selectedBlogEntry.id}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleRefreshPublished}
                            className="px-3 py-1 text-xs uppercase tracking-wide bg-green-700 hover:bg-green-600 text-black font-semibold rounded transition-colors disabled:bg-gray-700 disabled:text-gray-300"
                            disabled={isLoadingPublished}
                          >
                            {isLoadingPublished ? "Syncing..." : "Sync Published"}
                          </button>
                        </div>
                      </div>
                      {publishError && (
                        <div className="p-2 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
                          {publishError}
                        </div>
                      )}
                      {publishMessage && (
                        <div className="p-2 bg-green-900/50 border border-green-500 rounded text-green-200 text-sm">
                          {publishMessage}
                        </div>
                      )}
                    </div>
                    <label className="block">
                      <span className="text-sm font-semibold text-green-200 uppercase tracking-wide">
                        Title
                      </span>
                      <input
                        value={editedTitle}
                        onChange={(event) => {
                          setEditedTitle(event.target.value);
                          resetPublishAlerts();
                        }}
                        className="mt-1 w-full bg-black/60 border border-green-500/40 rounded px-3 py-2 text-green-100 focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-green-200 uppercase tracking-wide">
                        Blog Content
                      </span>
                      <textarea
                        value={editedContent}
                        onChange={(event) => {
                          setEditedContent(event.target.value);
                          resetPublishAlerts();
                        }}
                        className="mt-1 w-full bg-black/60 border border-green-500/40 rounded px-3 py-2 text-green-100 focus:outline-none focus:ring-2 focus:ring-green-400 h-64"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-green-200 uppercase tracking-wide">
                        Referenced Articles (optional)
                      </span>
                      <textarea
                        value={editedRelatedArticles}
                        onChange={(event) => {
                          setEditedRelatedArticles(event.target.value);
                          resetPublishAlerts();
                        }}
                        className="mt-1 w-full bg-black/60 border border-green-500/40 rounded px-3 py-2 text-green-100 focus:outline-none focus:ring-2 focus:ring-green-400 h-32"
                        placeholder="One link or bullet per line"
                      />
                    </label>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={handleUseDraftContent}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-green-100 rounded transition-colors"
                      >
                        Use Draft Content
                      </button>
                      <button
                        onClick={handleUsePublishedContent}
                        disabled={!selectedPublishedPost}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-black font-semibold rounded transition-colors disabled:bg-gray-700 disabled:text-gray-300"
                      >
                        Load Published Version
                      </button>
                      <button
                        onClick={handlePublishBlog}
                        disabled={isPublishingBlog}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-black font-bold rounded transition-colors disabled:bg-gray-600 disabled:text-gray-300"
                      >
                        {isPublishingBlog
                          ? "Saving..."
                          : selectedPublishedPost
                            ? "Update Blog Post"
                            : "Publish to Blog"}
                      </button>
                    </div>
                    {editedRelatedArticles ? (
                      <div className="pt-2 text-xs text-green-300/80">
                        Lines will appear as bullet points on the blog page.
                      </div>
                    ) : null}
                    <details className="bg-black/60 border border-green-500/30 rounded-lg p-3">
                      <summary className="cursor-pointer text-green-200 font-semibold">
                        View Raw Newsletter Source
                      </summary>
                      <pre className="mt-3 whitespace-pre-wrap text-green-100 text-xs leading-relaxed max-h-64 overflow-y-auto">
                        {selectedBlogEntry.newsletter}
                      </pre>
                      {selectedBlogEntry.relatedArticles ? (
                        <div className="mt-3">
                          <h4 className="text-sm font-semibold text-green-200 mb-2 uppercase tracking-wide">
                            Draft References
                          </h4>
                          <ul className="list-disc list-inside text-green-100 text-xs space-y-1">
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
                    </details>
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
