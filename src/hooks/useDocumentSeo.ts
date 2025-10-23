import { useEffect, useRef } from "react";

interface MetaDefinition {
  name?: string;
  property?: string;
  content: string;
}

interface LinkDefinition {
  rel: string;
  href: string;
  type?: string;
  title?: string;
}

export interface UseDocumentSeoOptions {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  meta?: MetaDefinition[];
  links?: LinkDefinition[];
  jsonLd?: Record<string, unknown>[];
}

const OWNER_ATTRIBUTE = "data-seo-owner";
const KEY_ATTRIBUTE = "data-seo-key";

const buildMetaKey = (meta: MetaDefinition, index: number): string => {
  if (meta.name) {
    return `name:${meta.name}`;
  }
  if (meta.property) {
    return `property:${meta.property}`;
  }
  return `index:${index}`;
};

const buildLinkKey = (link: LinkDefinition): string =>
  `${link.rel}:${link.href}`;

export const useDocumentSeo = ({
  title,
  description,
  canonicalUrl,
  meta = [],
  links = [],
  jsonLd = [],
}: UseDocumentSeoOptions) => {
  const ownerIdRef = useRef<string | null>(null);
  if (!ownerIdRef.current) {
    ownerIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `seo-${Math.random().toString(36).slice(2, 12)}`;
  }
  const ownerId = ownerIdRef.current!;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const { head } = document;
    if (!head) {
      return;
    }

    const previousTitle = document.title;
    if (title) {
      document.title = title;
    }

    const metaDefinitions = [...meta];
    if (description) {
      metaDefinitions.unshift({ name: "description", content: description });
    }

    const metaKeys = new Set<string>();
    metaDefinitions.forEach((metaDefinition, index) => {
      if (!metaDefinition.content) {
        return;
      }
      const key = buildMetaKey(metaDefinition, index);
      metaKeys.add(key);

      let element = head.querySelector(
        `meta[${OWNER_ATTRIBUTE}="${ownerId}"][${KEY_ATTRIBUTE}="${key}"]`,
      ) as HTMLMetaElement | null;

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(OWNER_ATTRIBUTE, ownerId);
        element.setAttribute(KEY_ATTRIBUTE, key);
        head.appendChild(element);
      }

      if (metaDefinition.name) {
        element.setAttribute("name", metaDefinition.name);
      } else {
        element.removeAttribute("name");
      }

      if (metaDefinition.property) {
        element.setAttribute("property", metaDefinition.property);
      } else {
        element.removeAttribute("property");
      }

      element.setAttribute("content", metaDefinition.content);
    });

    head
      .querySelectorAll(`meta[${OWNER_ATTRIBUTE}="${ownerId}"]`)
      .forEach((element) => {
        const key = element.getAttribute(KEY_ATTRIBUTE);
        if (key && !metaKeys.has(key)) {
          head.removeChild(element);
        }
      });

    const linkDefinitions = [...links];
    if (canonicalUrl) {
      linkDefinitions.unshift({ rel: "canonical", href: canonicalUrl });
    }

    const linkKeys = new Set<string>();
    linkDefinitions.forEach((linkDefinition) => {
      if (!linkDefinition.href) {
        return;
      }

      const key = buildLinkKey(linkDefinition);
      linkKeys.add(key);

      let linkElement = head.querySelector(
        `link[${OWNER_ATTRIBUTE}="${ownerId}"][${KEY_ATTRIBUTE}="${key}"]`,
      ) as HTMLLinkElement | null;

      if (!linkElement) {
        linkElement = document.createElement("link");
        linkElement.setAttribute(OWNER_ATTRIBUTE, ownerId);
        linkElement.setAttribute(KEY_ATTRIBUTE, key);
        head.appendChild(linkElement);
      }

      linkElement.setAttribute("rel", linkDefinition.rel);
      linkElement.setAttribute("href", linkDefinition.href);

      if (linkDefinition.type) {
        linkElement.setAttribute("type", linkDefinition.type);
      } else {
        linkElement.removeAttribute("type");
      }

      if (linkDefinition.title) {
        linkElement.setAttribute("title", linkDefinition.title);
      } else {
        linkElement.removeAttribute("title");
      }
    });

    head
      .querySelectorAll(`link[${OWNER_ATTRIBUTE}="${ownerId}"]`)
      .forEach((element) => {
        const key = element.getAttribute(KEY_ATTRIBUTE);
        if (key && !linkKeys.has(key)) {
          head.removeChild(element);
        }
      });

    const jsonLdKeys = new Set<string>();
    jsonLd.forEach((schema, index) => {
      const key = `jsonld:${index}`;
      jsonLdKeys.add(key);

      let scriptElement = head.querySelector(
        `script[type="application/ld+json"][${OWNER_ATTRIBUTE}="${ownerId}"][${KEY_ATTRIBUTE}="${key}"]`,
      ) as HTMLScriptElement | null;

      if (!scriptElement) {
        scriptElement = document.createElement("script");
        scriptElement.type = "application/ld+json";
        scriptElement.setAttribute(OWNER_ATTRIBUTE, ownerId);
        scriptElement.setAttribute(KEY_ATTRIBUTE, key);
        head.appendChild(scriptElement);
      }

      scriptElement.textContent = JSON.stringify(schema);
    });

    head
      .querySelectorAll(
        `script[type="application/ld+json"][${OWNER_ATTRIBUTE}="${ownerId}"]`,
      )
      .forEach((element) => {
        const key = element.getAttribute(KEY_ATTRIBUTE);
        if (key && !jsonLdKeys.has(key)) {
          head.removeChild(element);
        }
      });

    return () => {
      if (title) {
        document.title = previousTitle;
      }

      head
        .querySelectorAll(`meta[${OWNER_ATTRIBUTE}="${ownerId}"]`)
        .forEach((element) => {
          head.removeChild(element);
        });

      head
        .querySelectorAll(`link[${OWNER_ATTRIBUTE}="${ownerId}"]`)
        .forEach((element) => {
          head.removeChild(element);
        });

      head
        .querySelectorAll(
          `script[type="application/ld+json"][${OWNER_ATTRIBUTE}="${ownerId}"]`,
        )
        .forEach((element) => {
          head.removeChild(element);
        });
    };
  }, [
    title,
    description,
    canonicalUrl,
    JSON.stringify(meta ?? []),
    JSON.stringify(links ?? []),
    JSON.stringify(jsonLd ?? []),
  ]);
};
