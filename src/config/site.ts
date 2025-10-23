const DEFAULT_SITE_URL = "https://fns-news-decoded5.vercel.app";

export const SITE_URL =
  import.meta.env.VITE_SITE_URL?.replace(/\/+$/, "") || DEFAULT_SITE_URL;

export const SITE_NAME =
  import.meta.env.VITE_SITE_NAME || "Fragile News Source";

export const OG_IMAGE_URL =
  import.meta.env.VITE_OG_IMAGE ||
  `${SITE_URL}/eye_logo.png`;

export const BLOG_TAGLINE =
  import.meta.env.VITE_BLOG_TAGLINE ||
  "Ethical AI intelligence briefings from the Fragile News Source.";

