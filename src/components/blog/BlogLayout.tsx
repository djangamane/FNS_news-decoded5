import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, Outlet } from "react-router-dom";
import Header from "../Header";
import Footer from "../Footer";
import LoadingSpinner from "../LoadingSpinner";
import { BlogPost } from "../../types";
import { fetchPublishedBlogPosts } from "../../services/blogService";

interface BlogContextValue {
  posts: BlogPost[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => void;
}

const BlogContext = createContext<BlogContextValue | undefined>(undefined);

export const useBlogContext = (): BlogContextValue => {
  const context = useContext(BlogContext);
  if (!context) {
    throw new Error("useBlogContext must be used within a BlogLayout provider");
  }
  return context;
};

const BlogLayout: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(
    async (refresh = false) => {
      setError(null);
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const blogPosts = await fetchPublishedBlogPosts();
        setPosts(blogPosts);
      } catch (err) {
        console.error("Unable to load published blog posts:", err);
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
    },
    [setPosts, setIsLoading, setIsRefreshing, setError],
  );

  useEffect(() => {
    loadPosts().catch((err) => {
      console.error("Initial blog load failed:", err);
    });
  }, [loadPosts]);

  const contextValue = useMemo<BlogContextValue>(
    () => ({
      posts,
      isLoading,
      isRefreshing,
      error,
      refresh: () => {
        loadPosts(true).catch((err) => {
          console.error("Unable to refresh blog posts:", err);
        });
      },
    }),
    [posts, isLoading, isRefreshing, error, loadPosts],
  );

  const showInitialSpinner = isLoading && posts.length === 0 && !error;

  return (
    <BlogContext.Provider value={contextValue}>
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
          <div className="flex items-center mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-3 py-2 border border-green-500/40 text-green-200 rounded hover:bg-green-500/10 transition-colors"
            >
              <span aria-hidden="true">←</span>
              <span>Back to home</span>
            </Link>
          </div>
          {showInitialSpinner ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner message="Loading Ethical AI briefings..." />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        <Footer />
      </div>
    </BlogContext.Provider>
  );
};

export default BlogLayout;
