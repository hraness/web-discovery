import type { Metadata, MetadataRoute } from "next";

export const LARGE_SOCIAL_IMAGE = {
  height: 630,
  width: 1200,
} as const;

export const INDEXABLE_ROBOTS = {
  follow: true,
  googleBot: {
    follow: true,
    index: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  index: true,
} as const satisfies NonNullable<Metadata["robots"]>;

export const NOINDEX_ROBOTS = {
  follow: false,
  googleBot: {
    follow: false,
    index: false,
    noarchive: true,
    nosnippet: true,
  },
  index: false,
} as const satisfies NonNullable<Metadata["robots"]>;

export type OwnedPath = `/${string}`;

export type SearchSite = Readonly<{
  applicationName?: string;
  category?: string;
  creator?: string;
  description: string;
  language?: string;
  locale?: string;
  name: string;
  origin: `https://${string}`;
  publisher?: string;
  socialImage?: Readonly<{
    alt: string;
    height?: number;
    path: OwnedPath;
    width?: number;
  }>;
  socialTitle?: string;
  title: string;
  titleTemplate?: string;
}>;

export type SitemapPath = Readonly<{
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  images?: readonly OwnedPath[];
  lastModified?: Date | string;
  path: OwnedPath;
  priority?: number;
}>;

export type IndexNowPayload = Readonly<{
  host: string;
  key: string;
  keyLocation: string;
  urlList: readonly string[];
}>;

export type ImageContentType = "image/jpeg" | "image/png" | "image/webp";

export type RepresentativeImage = Readonly<{
  alt: string;
  caption?: string;
  contentType: ImageContentType;
  credit?: string;
  height: number;
  path: OwnedPath;
  social?: Readonly<{
    height: number;
    path: OwnedPath;
    width: number;
  }>;
  width: number;
}>;

export type ArticleParty = Readonly<{
  kind: "Organization" | "Person";
  name: string;
  path?: OwnedPath;
}>;

export type ArticleDiscovery = Readonly<{
  authors?: readonly ArticleParty[];
  canonicalPath: OwnedPath;
  category?: string;
  citations?: readonly `https://${string}`[];
  description: string;
  image: RepresentativeImage;
  isAccessibleForFree?: boolean;
  isPartOfPath?: OwnedPath;
  keywords?: readonly string[];
  modifiedTime?: string;
  publishedTime?: string;
  publisher?: ArticleParty;
  section?: string;
  title: string;
  type: "Article" | "BlogPosting" | "NewsArticle";
}>;

export type AtomImageEnclosure = Readonly<{
  href: string;
  rel: "enclosure";
  type: ImageContentType;
}>;

export type RssImageEnclosure = Readonly<{
  length: number;
  type: ImageContentType;
  url: string;
}>;

function parsedOrigin(origin: SearchSite["origin"]): URL {
  const parsed = new URL(origin);
  if (
    parsed.protocol !== "https:"
    || parsed.username.length > 0
    || parsed.password.length > 0
    || parsed.pathname !== "/"
    || parsed.search.length > 0
    || parsed.hash.length > 0
  ) {
    throw new RangeError(`Search origins must be bare HTTPS origins; received ${origin}.`);
  }
  return parsed;
}

function assertOwnedPath(path: string): asserts path is OwnedPath {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new RangeError(`Owned paths must be root-relative; received ${path}.`);
  }
  const parsed = new URL(path, "https://owned.invalid");
  if (
    parsed.origin !== "https://owned.invalid"
    || parsed.search.length > 0
    || parsed.hash.length > 0
    || parsed.pathname !== path
  ) {
    throw new RangeError(
      `Owned paths cannot change origin, include queries or fragments, or require URL normalization; received ${path}.`,
    );
  }
}

export function parseOwnedPath(path: string): OwnedPath {
  assertOwnedPath(path);
  return path;
}

export function absoluteWebUrl(
  origin: SearchSite["origin"],
  path: OwnedPath,
): string {
  const base = parsedOrigin(origin);
  assertOwnedPath(path);
  return new URL(path, base).toString();
}

function assertNonempty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new RangeError(`${label} cannot be empty.`);
  }
}

function assertImageDimension(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive safe integer.`);
  }
}

function assertRepresentativeImage(image: RepresentativeImage): void {
  assertOwnedPath(image.path);
  assertNonempty(image.alt, "Representative image alt text");
  assertImageDimension(image.width, "Representative image width");
  assertImageDimension(image.height, "Representative image height");
  if (image.caption !== undefined) {
    assertNonempty(image.caption, "Representative image caption");
  }
  if (image.credit !== undefined) {
    assertNonempty(image.credit, "Representative image credit");
  }
  if (image.social !== undefined) {
    assertOwnedPath(image.social.path);
    assertImageDimension(image.social.width, "Social image width");
    assertImageDimension(image.social.height, "Social image height");
  }
}

function assertArticleParty(party: ArticleParty): void {
  assertNonempty(party.name, "Article party name");
  if (party.path !== undefined) assertOwnedPath(party.path);
}

function assertIsoDateTime(value: string, label: string): void {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value) {
    throw new RangeError(`${label} must be a canonical ISO 8601 UTC timestamp.`);
  }
}

function articleUrl(site: SearchSite, article: ArticleDiscovery): string {
  assertOwnedPath(article.canonicalPath);
  assertNonempty(article.title, "Article title");
  assertNonempty(article.description, "Article description");
  assertRepresentativeImage(article.image);
  article.authors?.forEach(assertArticleParty);
  if (article.publisher !== undefined) assertArticleParty(article.publisher);
  if (article.publishedTime !== undefined) {
    assertIsoDateTime(article.publishedTime, "Article publishedTime");
  }
  if (article.modifiedTime !== undefined) {
    assertIsoDateTime(article.modifiedTime, "Article modifiedTime");
  }
  return absoluteWebUrl(site.origin, article.canonicalPath);
}

function partyJsonLd(site: SearchSite, party: ArticleParty) {
  assertArticleParty(party);
  return {
    "@type": party.kind,
    name: party.name,
    ...(party.path === undefined
      ? {}
      : { url: absoluteWebUrl(site.origin, party.path) }),
  } as const;
}

export function representativeImageUrls(
  origin: SearchSite["origin"],
  image: RepresentativeImage,
) {
  assertRepresentativeImage(image);
  const social = image.social ?? image;
  return {
    article: {
      alt: image.alt,
      height: image.height,
      type: image.contentType,
      url: absoluteWebUrl(origin, image.path),
      width: image.width,
    },
    social: {
      alt: image.alt,
      height: social.height,
      type: image.contentType,
      url: absoluteWebUrl(origin, social.path),
      width: social.width,
    },
  } as const;
}

export function createArticleMetadata(
  site: SearchSite,
  article: ArticleDiscovery,
): Metadata {
  const canonical = articleUrl(site, article);
  const images = representativeImageUrls(site.origin, article.image);
  const authorUrls = article.authors?.flatMap((author) => (
    author.path === undefined ? [] : [absoluteWebUrl(site.origin, author.path)]
  ));
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical },
    ...(article.authors === undefined
      ? {}
      : {
        authors: article.authors.map((author) => ({
          name: author.name,
          ...(author.path === undefined
            ? {}
            : { url: absoluteWebUrl(site.origin, author.path) }),
        })),
      }),
    ...(article.publisher === undefined
      ? {}
      : { publisher: article.publisher.name }),
    ...(article.category === undefined ? {} : { category: article.category }),
    openGraph: {
      type: "article",
      url: canonical,
      siteName: site.name,
      title: article.title,
      description: article.description,
      locale: site.locale ?? "en_US",
      ...(article.publishedTime === undefined
        ? {}
        : { publishedTime: article.publishedTime }),
      ...(article.modifiedTime === undefined
        ? {}
        : { modifiedTime: article.modifiedTime }),
      ...(authorUrls === undefined || authorUrls.length === 0
        ? {}
        : { authors: authorUrls }),
      ...(article.section === undefined ? {} : { section: article.section }),
      ...(article.keywords === undefined ? {} : { tags: [...article.keywords] }),
      images: [images.social],
    },
    robots: INDEXABLE_ROBOTS,
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
      images: [images.social],
    },
  };
}

export function articleJsonLd(site: SearchSite, article: ArticleDiscovery) {
  const url = articleUrl(site, article);
  const image = representativeImageUrls(site.origin, article.image).article;
  return {
    "@context": "https://schema.org",
    "@type": article.type,
    "@id": `${url}#article`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    headline: article.title,
    description: article.description,
    image: {
      "@type": "ImageObject",
      contentUrl: image.url,
      url: image.url,
      description: article.image.alt,
      height: image.height,
      width: image.width,
      representativeOfPage: true,
      ...(article.image.caption === undefined
        ? {}
        : { caption: article.image.caption }),
      ...(article.image.credit === undefined
        ? {}
        : { creditText: article.image.credit }),
    },
    ...(article.publishedTime === undefined
      ? {}
      : { datePublished: article.publishedTime }),
    ...(article.modifiedTime === undefined
      ? {}
      : { dateModified: article.modifiedTime }),
    ...(article.authors === undefined
      ? {}
      : { author: article.authors.map((author) => partyJsonLd(site, author)) }),
    ...(article.publisher === undefined
      ? {}
      : { publisher: partyJsonLd(site, article.publisher) }),
    ...(article.isPartOfPath === undefined
      ? {}
      : {
        isPartOf: {
          "@id": `${absoluteWebUrl(site.origin, article.isPartOfPath)}#website`,
        },
      }),
    ...(article.isAccessibleForFree === undefined
      ? {}
      : { isAccessibleForFree: article.isAccessibleForFree }),
    inLanguage: site.language ?? "en-US",
    ...(article.section === undefined
      ? {}
      : { articleSection: article.section }),
    ...(article.keywords === undefined
      ? {}
      : { keywords: [...article.keywords] }),
    ...(article.citations === undefined
      ? {}
      : { citation: [...article.citations] }),
  } as const;
}

export function createArticleSitemapPath(
  article: ArticleDiscovery,
): SitemapPath {
  assertOwnedPath(article.canonicalPath);
  assertRepresentativeImage(article.image);
  const lastModified = article.modifiedTime ?? article.publishedTime;
  if (lastModified !== undefined) {
    assertIsoDateTime(lastModified, "Article sitemap lastModified");
  }
  return {
    images: [article.image.path],
    ...(lastModified === undefined ? {} : { lastModified }),
    path: article.canonicalPath,
  };
}

export function createAtomImageEnclosure(
  origin: SearchSite["origin"],
  image: RepresentativeImage,
): AtomImageEnclosure {
  assertRepresentativeImage(image);
  return {
    href: absoluteWebUrl(origin, image.path),
    rel: "enclosure",
    type: image.contentType,
  };
}

export function createRssImageEnclosure(
  origin: SearchSite["origin"],
  image: RepresentativeImage,
  length: number,
): RssImageEnclosure {
  assertRepresentativeImage(image);
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new RangeError("RSS enclosure length must be a nonnegative safe integer.");
  }
  return {
    length,
    type: image.contentType,
    url: absoluteWebUrl(origin, image.path),
  };
}

function socialImage(site: SearchSite) {
  const image = site.socialImage ?? {
    alt: `${site.name} — ${site.description}`,
    path: "/opengraph-image" as const,
  };
  return {
    alt: image.alt,
    height: image.height ?? LARGE_SOCIAL_IMAGE.height,
    url: absoluteWebUrl(site.origin, image.path),
    width: image.width ?? LARGE_SOCIAL_IMAGE.width,
  };
}

export function createPublicSiteMetadata(
  site: SearchSite,
  options: Readonly<{
    canonicalPath?: OwnedPath;
    feedPath?: OwnedPath;
  }> = {},
): Metadata {
  const canonicalPath = options.canonicalPath ?? "/";
  const canonical = absoluteWebUrl(site.origin, canonicalPath);
  const image = socialImage(site);
  const socialTitle = site.socialTitle ?? site.title;
  const alternates = {
    canonical,
    ...(options.feedPath === undefined
      ? {}
      : {
        types: {
          "application/rss+xml": absoluteWebUrl(site.origin, options.feedPath),
        },
      }),
  };

  return {
    metadataBase: parsedOrigin(site.origin),
    title: site.titleTemplate === undefined
      ? site.title
      : { default: site.title, template: site.titleTemplate },
    description: site.description,
    applicationName: site.applicationName ?? site.name,
    alternates,
    ...(site.category === undefined ? {} : { category: site.category }),
    ...(site.creator === undefined ? {} : { creator: site.creator }),
    ...(site.publisher === undefined ? {} : { publisher: site.publisher }),
    openGraph: {
      type: "website",
      url: canonical,
      siteName: site.name,
      title: socialTitle,
      description: site.description,
      locale: site.locale ?? "en_US",
      images: [image],
    },
    robots: INDEXABLE_ROBOTS,
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: site.description,
      images: [{ alt: image.alt, url: image.url }],
    },
  };
}

export function createPrivateSiteMetadata(site: SearchSite): Metadata {
  return {
    metadataBase: parsedOrigin(site.origin),
    title: site.titleTemplate === undefined
      ? site.title
      : { default: site.title, template: site.titleTemplate },
    description: site.description,
    applicationName: site.applicationName ?? site.name,
    robots: NOINDEX_ROBOTS,
  };
}

export function createPublicRobots(
  origin: SearchSite["origin"],
  options: Readonly<{ disallow?: readonly OwnedPath[] }> = {},
): MetadataRoute.Robots {
  const disallow = options.disallow ?? [];
  disallow.forEach(assertOwnedPath);
  return {
    host: parsedOrigin(origin).origin,
    rules: {
      allow: "/",
      ...(disallow.length === 0 ? {} : { disallow: [...disallow] }),
      userAgent: "*",
    },
    sitemap: absoluteWebUrl(origin, "/sitemap.xml"),
  };
}

export function createPrivateRobots(): MetadataRoute.Robots {
  return {
    rules: {
      disallow: "/",
      userAgent: "*",
    },
  };
}

export function createSitemap(
  origin: SearchSite["origin"],
  paths: readonly SitemapPath[],
): MetadataRoute.Sitemap {
  parsedOrigin(origin);
  const seen = new Set<string>();
  return paths.map((entry) => {
    assertOwnedPath(entry.path);
    const url = absoluteWebUrl(origin, entry.path);
    if (seen.has(url)) {
      throw new RangeError(
        `Sitemap paths must be unique after URL normalization; received ${entry.path} as ${url} twice.`,
      );
    }
    seen.add(url);
    const images = entry.images?.map((imagePath) => {
      assertOwnedPath(imagePath);
      return absoluteWebUrl(origin, imagePath);
    });
    return {
      url,
      ...(entry.lastModified === undefined ? {} : { lastModified: entry.lastModified }),
      ...(entry.changeFrequency === undefined
        ? {}
        : { changeFrequency: entry.changeFrequency }),
      ...(entry.priority === undefined ? {} : { priority: entry.priority }),
      ...(images === undefined ? {} : { images }),
    };
  });
}

export function createWebManifest(
  site: SearchSite,
  colors: Readonly<{
    background: string;
    theme: string;
  }>,
): MetadataRoute.Manifest {
  return {
    id: "/",
    name: site.applicationName ?? site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: colors.background,
    theme_color: colors.theme,
    icons: [
      {
        purpose: "any",
        sizes: "512x512",
        src: "/icon.png",
        type: "image/png",
      },
    ],
  };
}

export function createIndexNowPayload(
  origin: SearchSite["origin"],
  key: string,
  paths: readonly OwnedPath[],
): IndexNowPayload {
  const base = parsedOrigin(origin);
  if (!/^[A-Z0-9-]{8,128}$/iu.test(key)) {
    throw new RangeError("IndexNow keys must use 8–128 letters, digits, or hyphens.");
  }
  if (paths.length === 0) {
    throw new RangeError("IndexNow submissions require at least one owned path.");
  }
  const urlList = [...new Set(paths)].map((path) => absoluteWebUrl(origin, path));
  return {
    host: base.hostname,
    key,
    keyLocation: absoluteWebUrl(origin, `/${key}.txt`),
    urlList,
  };
}

export function websiteJsonLd(site: SearchSite) {
  const url = absoluteWebUrl(site.origin, "/");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}#website`,
    url,
    name: site.name,
    description: site.description,
    inLanguage: site.language ?? "en-US",
  } as const;
}

export function webApplicationJsonLd(
  site: SearchSite,
  application: Readonly<{
    browserRequirements?: string;
    category: string;
    features?: readonly string[];
    free?: boolean;
  }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: site.name,
    url: absoluteWebUrl(site.origin, "/"),
    description: site.description,
    applicationCategory: application.category,
    operatingSystem: "Any",
    ...(application.browserRequirements === undefined
      ? {}
      : { browserRequirements: application.browserRequirements }),
    ...(application.features === undefined
      ? {}
      : { featureList: [...application.features] }),
    ...(application.free === undefined
      ? {}
      : {
        isAccessibleForFree: application.free,
        ...(application.free
          ? {
            offers: {
              "@type": "Offer",
              price: 0,
              priceCurrency: "USD",
            },
          }
          : {}),
      }),
  } as const;
}

export function profilePageJsonLd(
  site: SearchSite,
  person: Readonly<{
    image?: OwnedPath;
    name: string;
    sameAs?: readonly string[];
  }>,
) {
  const url = absoluteWebUrl(site.origin, "/");
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${url}#profile`,
    url,
    name: site.title,
    description: site.description,
    mainEntity: {
      "@type": "Person",
      "@id": `${url}#person`,
      name: person.name,
      url,
      description: site.description,
      ...(person.image === undefined
        ? {}
        : { image: absoluteWebUrl(site.origin, person.image) }),
      ...(person.sameAs === undefined ? {} : { sameAs: [...person.sameAs] }),
    },
  } as const;
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
