const {
  createBlogSlug,
  createBlogExcerpt,
  normaliseTimestamp,
} = require("./blog");

const escapeXml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const formatIsoDate = (value) => {
  const iso = normaliseTimestamp(value);
  if (!iso) {
    return null;
  }
  return iso.split(".")[0] + "Z";
};

const formatRssDate = (value) => {
  const iso = normaliseTimestamp(value);
  if (!iso) {
    return new Date().toUTCString();
  }
  return new Date(iso).toUTCString();
};

const buildSitemapXml = (posts, siteUrl) => {
  const urls = posts.map((post) => {
    const slug = createBlogSlug(post);
    const loc = `${siteUrl}/blog/${slug}`;
    const lastmod = formatIsoDate(post.updatedAt || post.publishedAt);
    return `
  <url>
    <loc>${escapeXml(loc)}</loc>${
      lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""
    }
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`.trim();
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
};

const buildRssXml = (posts, options) => {
  const siteUrl = options.siteUrl;
  const siteName = options.siteName;
  const description = options.description;

  const items = posts.map((post) => {
    const slug = createBlogSlug(post);
    const postUrl = `${siteUrl}/blog/${slug}`;
    const pubDate = formatRssDate(post.publishedAt);
    const excerpt = createBlogExcerpt(post.content, 240);
    const content = post.content || excerpt;

    return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="false">${escapeXml(post.sourceId || post.id)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <description><![CDATA[${excerpt}]]></description>
      <content:encoded><![CDATA[${content}]]></content:encoded>
    </item>`.trim();
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[${siteName} Ethical AI Briefings]]></title>
    <link>${escapeXml(`${siteUrl}/blog`)}</link>
    <description><![CDATA[${description}]]></description>
    <language>en-US</language>
    <lastBuildDate>${escapeXml(new Date().toUTCString())}</lastBuildDate>
${items.join("\n")}
  </channel>
</rss>`;
};

module.exports = {
  buildSitemapXml,
  buildRssXml,
};
