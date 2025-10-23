import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useBlogContext } from "./BlogLayout";
import BlogSidebar from "./BlogSidebar";
import Seo from "../Seo";
import {
  BLOG_TAGLINE,
  OG_IMAGE_URL,
  SITE_NAME,
  SITE_URL,
} from "../../config/site";
import {
  createBlogExcerpt,
  formatBlogPublishedDate,
} from "../../utils/blog";

const POSTS_PER_PAGE = 10;

const BlogIndex: React.FC = () => {
  const { posts, isLoading, error } = useBlogContext();
  const { page: pageParam } = useParams<{ page?: string }>();

  const parsedPage = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const currentPage =
    Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));

  const safePage =
    currentPage > totalPages ? Math.min(currentPage, totalPages) : currentPage;

  const paginatedPosts = useMemo(() => {
    const startIndex = (safePage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    return posts.slice(startIndex, endIndex);
  }, [posts, safePage]);

  const canonicalUrl =
    safePage === 1
      ? `${SITE_URL}/blog`
      : `${SITE_URL}/blog/page/${safePage}`;

  const pageTitle =
    safePage === 1
      ? `Ethical AI Briefings | ${SITE_NAME}`
      : `Ethical AI Briefings – Page ${safePage} | ${SITE_NAME}`;

  const description = `${BLOG_TAGLINE}${
    safePage > 1 ? ` (Archive page ${safePage})` : ""
  }`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Ethical AI Briefings",
      description: BLOG_TAGLINE,
      url: `${SITE_URL}/blog`,
      blogPost: paginatedPosts.map((post, index) => ({
        "@type": "BlogPosting",
        headline: post.title,
        datePublished: post.publishedAt,
        url: `${SITE_URL}/blog/${post.slug}`,
        position: (safePage - 1) * POSTS_PER_PAGE + index + 1,
      })),
    },
  ];

  const renderContent = () => {
    if (error) {
      return (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-300">
          {error}
        </div>
      );
    }

    if (isLoading && posts.length === 0) {
      return null;
    }

    if (!paginatedPosts.length) {
      return (
        <div className="p-6 bg-black/70 border border-green-500/30 rounded-lg text-center text-green-200">
          No blog posts have been published yet. Check back soon.
        </div>
      );
    }

    return (
      <>
        <div className="grid gap-6 md:grid-cols-[280px,1fr]">
          <BlogSidebar limit={50} />
          <section className="bg-black/70 border border-green-500/30 rounded-lg p-6 hologram-card space-y-6">
            {paginatedPosts.map((post) => (
              <article
                key={post.slug}
                className="bg-black/60 border border-green-500/20 rounded-lg p-5 space-y-3"
              >
                <header>
                  <p className="text-sm text-green-200/80 uppercase tracking-wide">
                    {formatBlogPublishedDate(post.publishedAt)}
                  </p>
                  <h2 className="text-2xl font-bold text-green-300 glow-green">
                    <Link to={`/blog/${post.slug}`} className="hover:underline">
                      {post.title}
                    </Link>
                  </h2>
                </header>
                <p className="text-green-100 text-sm leading-relaxed">
                  {createBlogExcerpt(post.content, 200)}
                </p>
                <div className="flex justify-between items-center pt-3">
                  <Link
                    to={`/blog/${post.slug}`}
                    className="inline-flex items-center px-4 py-2 border border-green-400 text-green-200 rounded hover:bg-green-500/20 transition-colors"
                  >
                    Read the full edition
                  </Link>
                  <span className="text-green-300/80 text-xs uppercase tracking-wide">
                    Ethical AI Focus
                  </span>
                </div>
              </article>
            ))}
          </section>
        </div>
        {totalPages > 1 ? (
          <nav
            className="mt-6 flex justify-center items-center gap-3 text-green-200"
            aria-label="Archive pagination"
          >
            <Link
              to={safePage > 2 ? `/blog/page/${safePage - 1}` : "/blog"}
              className={`px-3 py-2 border border-green-500/30 rounded hover:bg-green-500/10 transition-colors ${
                safePage === 1 ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Previous
            </Link>
            <span className="text-sm">
              Page {safePage} of {totalPages}
            </span>
            <Link
              to={`/blog/page/${safePage + 1}`}
              className={`px-3 py-2 border border-green-500/30 rounded hover:bg-green-500/10 transition-colors ${
                safePage >= totalPages
                  ? "pointer-events-none opacity-50"
                  : ""
              }`}
            >
              Next
            </Link>
          </nav>
        ) : null}
      </>
    );
  };

  return (
    <>
      <Seo
        title={pageTitle}
        description={description}
        canonicalUrl={canonicalUrl}
        meta={[
          { property: "og:title", content: pageTitle },
          { property: "og:description", content: description },
          { property: "og:type", content: "website" },
          { property: "og:url", content: canonicalUrl },
          { property: "og:site_name", content: SITE_NAME },
          { property: "og:image", content: OG_IMAGE_URL },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:title", content: pageTitle },
          { name: "twitter:description", content: description },
          { name: "twitter:image", content: OG_IMAGE_URL },
        ]}
        links={[
          {
            rel: "alternate",
            type: "application/rss+xml",
            href: `${SITE_URL}/api/blog/rss.xml`,
            title: `${SITE_NAME} Ethical AI RSS`,
          },
          {
            rel: "sitemap",
            type: "application/xml",
            href: `${SITE_URL}/api/blog/sitemap.xml`,
            title: `${SITE_NAME} Blog Sitemap`,
          },
        ]}
        jsonLd={jsonLd}
      />
      <header className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.4em] text-green-500/80">
          Fragile News Source
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-green-300 glow-green">
          Ethical AI in Action
        </h1>
        <p className="text-green-100/80 max-w-3xl">{BLOG_TAGLINE}</p>
      </header>
      {renderContent()}
    </>
  );
};

export default BlogIndex;

