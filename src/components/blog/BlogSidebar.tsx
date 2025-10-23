import React from "react";
import { Link } from "react-router-dom";
import { useBlogContext } from "./BlogLayout";
import { formatBlogPublishedDate } from "../../utils/blog";

interface BlogSidebarProps {
  activeSlug?: string | null;
  limit?: number;
}

const BlogSidebar: React.FC<BlogSidebarProps> = ({
  activeSlug,
  limit,
}: BlogSidebarProps) => {
  const { posts, refresh, isRefreshing } = useBlogContext();

  const sidebarPosts = limit ? posts.slice(0, limit) : posts;

  return (
    <aside className="bg-black/70 border border-green-500/30 rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-green-300">Archives</h2>
        <button
          onClick={refresh}
          className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-black font-semibold rounded transition-colors disabled:bg-gray-600 disabled:text-gray-300"
          disabled={isRefreshing}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {sidebarPosts.length === 0 ? (
        <p className="text-green-200 text-sm">
          No published editions yet. Check back soon.
        </p>
      ) : (
        <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          {sidebarPosts.map((post) => {
            const isActive = activeSlug === post.slug;
            return (
              <li key={post.slug}>
                <Link
                  to={`/blog/${post.slug}`}
                  className={`block w-full text-left px-3 py-2 rounded border transition-colors ${
                    isActive
                      ? "border-green-400 bg-green-900/60 text-green-100"
                      : "border-green-500/30 bg-black/60 text-green-300 hover:bg-green-800/40"
                  }`}
                >
                  <p className="text-sm uppercase tracking-wide text-green-300/80">
                    {formatBlogPublishedDate(post.publishedAt)}
                  </p>
                  <p className="text-base font-semibold truncate">
                    {post.title}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
};

export default BlogSidebar;

