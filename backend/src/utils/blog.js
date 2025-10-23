const NON_ALPHANUMERIC = /[^a-z0-9]+/gi;
const LEADING_TRAILING_HYPHENS = /^-+|-+$/g;

const slugifySegment = (value) => {
  return value
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, "-")
    .replace(LEADING_TRAILING_HYPHENS, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);
};

const normaliseTimestamp = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
};

const deriveDateSegment = (publishedAt) => {
  const iso = normaliseTimestamp(publishedAt);
  if (!iso) {
    return null;
  }
  return iso.split("T")[0];
};

const createBlogSlug = ({ title, publishedAt, sourceId, id }) => {
  const dateSegment = deriveDateSegment(publishedAt);
  const titleSegment = title ? slugifySegment(title) : "";
  const identifier = sourceId || id || "";

  const prefixParts = [];
  if (dateSegment) {
    prefixParts.push(dateSegment);
  }
  if (titleSegment) {
    prefixParts.push(titleSegment);
  }

  const prefix = prefixParts.join("-");

  if (!identifier) {
    return prefix || "newsletter";
  }

  return prefix ? `${prefix}--${identifier}` : identifier;
};

const createBlogExcerpt = (content, maxLength = 160) => {
  if (!content) {
    return "";
  }

  const normalised = content.replace(/\s+/g, " ").trim();
  if (normalised.length <= maxLength) {
    return normalised;
  }

  const truncated = normalised.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const safeEnd = lastSpace > 0 ? lastSpace : truncated.length;
  return `${truncated.slice(0, safeEnd)}…`;
};

module.exports = {
  createBlogSlug,
  createBlogExcerpt,
  normaliseTimestamp,
};
