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
  extractBlogSummary,
  formatBlogPublishedDate,
} from "../../utils/blog";

const BlogPostPage: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const { posts, isLoading, error } = useBlogContext();

  const post = useMemo(
    () => posts.find((candidate) => candidate.slug === slug),
    [posts, slug],
  );

  const canonicalUrl = `${SITE_URL}/blog/${slug}`;

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-300">
        {error}
      </div>
    );
  }

  if (isLoading && !post) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="text-green-200">Loading edition…</span>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-black/70 border border-green-500/30 rounded-lg p-6 text-green-200 space-y-4">
        <h1 className="text-3xl font-bold text-green-300">
          Edition not found
        </h1>
        <p>
          We could not locate that Ethical AI briefing. It might have been
          archived under a different link.
        </p>
        <Link
          to="/blog"
          className="inline-flex px-4 py-2 border border-green-400 rounded hover:bg-green-500/20 transition-colors"
        >
          Back to archive
        </Link>
      </div>
    );
  }

  const description = createBlogExcerpt(post.content, 180);
  const structuredSummary = extractBlogSummary(post.content);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
      author: {
        "@type": "Organization",
        name: SITE_NAME,
      },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        logo: {
          "@type": "ImageObject",
          url: OG_IMAGE_URL,
        },
      },
      articleBody: post.content,
    },
  ];

  const relatedArticles = post.relatedArticles
    ? post.relatedArticles
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  return (
    <>
      <Seo
        title={`${post.title} | ${SITE_NAME}`}
        description={description}
        canonicalUrl={canonicalUrl}
        meta={[
          { property: "og:type", content: "article" },
          { property: "og:title", content: post.title },
          { property: "og:description", content: description },
          { property: "og:url", content: canonicalUrl },
          { property: "og:site_name", content: SITE_NAME },
          { property: "og:image", content: OG_IMAGE_URL },
          { property: "article:published_time", content: post.publishedAt },
          { property: "article:section", content: "Ethical AI" },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:title", content: post.title },
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
        ]}
        jsonLd={jsonLd}
      />
      <div className="grid gap-6 md:grid-cols-[280px,1fr]">
        <BlogSidebar activeSlug={post.slug} />
        <article className="bg-black/70 border border-green-500/30 rounded-lg p-6 hologram-card space-y-6">
          <header className="space-y-3">
            <p className="text-sm text-green-200/80 uppercase tracking-wide">
              {formatBlogPublishedDate(post.publishedAt)}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-green-300 glow-green">
              {post.title}
            </h1>
            <p className="text-green-200/80 text-sm uppercase tracking-widest">
              Ethical AI Intelligence Briefing
            </p>
          </header>
          <section className="bg-black/60 border border-green-500/20 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-green-100 font-mono text-sm leading-relaxed">
              {post.content}
            </pre>
          </section>
          {relatedArticles.length ? (
            <section className="bg-black/60 border border-green-500/20 rounded-lg p-4 space-y-3">
              <h2 className="text-xl font-semibold text-green-300">
                Referenced Articles
              </h2>
              <ul className="list-disc list-inside space-y-2 text-green-100 text-sm">
                {relatedArticles.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </section>
          ) : null}
          <footer className="flex justify-between items-center pt-2 text-green-300/80 text-xs uppercase tracking-widest">
            <span>Fragile News Source</span>
            <span>{structuredSummary}</span>
          </footer>
        </article>
      </div>
    </>
  );
};

export default BlogPostPage;

