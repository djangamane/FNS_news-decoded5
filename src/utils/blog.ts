const NON_ALPHANUMERIC = /[^a-z0-9]+/g;
const LEADING_TRAILING_HYPHENS = /^-+|-+$/g;

const MAX_SLUG_SEGMENT_LENGTH = 60;

const truncate = (value: string, maxLength: number): string =>
  value.length <= maxLength ? value : value.slice(0, maxLength);

const slugifySegment = (value: string): string => {
  const lower = value.toLowerCase();
  const collapsed = lower.replace(NON_ALPHANUMERIC, "-");
  const trimmed = collapsed.replace(LEADING_TRAILING_HYPHENS, "");
  const deduped = trimmed.replace(/-{2,}/g, "-");
  return truncate(deduped, MAX_SLUG_SEGMENT_LENGTH);
};

const normaliseDateToIso = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
};

const deriveDateSegment = (publishedAt?: string | null): string | null => {
  const iso = normaliseDateToIso(publishedAt);
  if (!iso) {
    return null;
  }
  return iso.split("T")[0];
};

export interface BlogSlugInput {
  title?: string | null;
  publishedAt?: string | null;
  sourceId?: string | null;
  id?: string | null;
}

/**
 * Generates a stable blog slug that keeps the identifier (sourceId) embedded
 * to allow canonical URLs while remaining human-readable.
 */
export const createBlogSlug = ({
  title,
  publishedAt,
  sourceId,
  id,
}: BlogSlugInput): string => {
  const dateSegment = deriveDateSegment(publishedAt);
  const titleSegment = title ? slugifySegment(title) : "";
  const identifier = sourceId || id || "";
  const prefixParts = [dateSegment, titleSegment].filter(
    (segment) => segment && segment.length > 0,
  );

  const prefix = prefixParts.join("-");
  if (!identifier) {
    return prefix || "newsletter";
  }

  return prefix ? `${prefix}--${identifier}` : identifier;
};

/**
 * Extracts the embedded blog source identifier from a slug generated using
 * {@link createBlogSlug}.
 */
export const extractSourceIdFromSlug = (slug: string): string | null => {
  if (!slug) {
    return null;
  }

  const parts = slug.split("--");
  if (!parts.length) {
    return null;
  }

  const identifier = parts[parts.length - 1];
  return identifier && identifier.length > 0 ? identifier : null;
};

export const formatBlogPublishedDate = (
  isoDate?: string | null,
  locale = "en-US",
): string => {
  if (!isoDate) {
    return "Date unavailable";
  }

  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) {
    return isoDate;
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed);
};

export const extractBlogSummary = (content: string): string => {
  if (!content) {
    return "No summary available.";
  }

  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)[0];

  return firstLine || "Daily Newsletter";
};

export const createBlogExcerpt = (
  content: string,
  maxLength = 160,
): string => {
  if (!content) {
    return "Daily digest on ethical AI developments and resilience.";
  }

  const normalised = content.replace(/\s+/g, " ").trim();
  if (normalised.length <= maxLength) {
    return normalised;
  }

  const truncated = normalised.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : truncated.length)}…`;
};

export const withBlogSlug = <T extends BlogSlugInput & { title: string; publishedAt: string; }>(
  post: T,
): T & { slug: string } => {
  const slug = createBlogSlug({
    title: post.title,
    publishedAt: post.publishedAt,
    sourceId: "sourceId" in post ? post.sourceId : undefined,
    id: "id" in post ? post.id : undefined,
  });

  return {
    ...post,
    slug,
  };
};
