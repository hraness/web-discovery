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

/**
 * An article names at most one parent: `blogPath` points `isPartOf` at the
 * visible blog index (`Blog`), while `isPartOfPath` keeps the older reference
 * to a `WebSite` node. Passing both is rejected.
 */
export type ArticleDiscovery = Readonly<{
  authors?: readonly ArticleParty[];
  canonicalPath: OwnedPath;
  category?: string;
  citations?: readonly `https://${string}`[];
  description: string;
  image: RepresentativeImage;
  isAccessibleForFree?: boolean;
  keywords?: readonly string[];
  modifiedTime?: string;
  publishedTime?: string;
  publisher?: ArticleParty;
  section?: string;
  title: string;
  type: "Article" | "BlogPosting" | "NewsArticle";
}> & (
  | Readonly<{ blogPath?: never; isPartOfPath?: OwnedPath }>
  | Readonly<{ blogPath: OwnedPath; isPartOfPath?: never }>
);

export type BreadcrumbStep = Readonly<{
  name: string;
  path: OwnedPath;
}>;

export type CollectionPageItem = Readonly<{
  name: string;
  url: `https://${string}`;
}>;

export type CollectionPageDiscovery = Readonly<{
  breadcrumb: readonly BreadcrumbStep[];
  dateModified?: string;
  description: string;
  items: readonly CollectionPageItem[];
  name: string;
  path: OwnedPath;
}>;

export type SchemaParty = Readonly<{
  kind: "MusicGroup" | "Organization" | "Person";
  name: string;
  path?: OwnedPath;
}>;

export type CreativeWorkDiscovery = Readonly<{
  author?: SchemaParty;
  creditText?: string;
  datePublished?: string;
  description: string;
  genre?: string;
  name: string;
  path: OwnedPath;
}>;

export type MusicAlbumTrack = Readonly<{
  durationSeconds?: number;
  name: string;
}>;

export type MusicAlbumDiscovery = Readonly<{
  byArtist: SchemaParty;
  description: string;
  name: string;
  path: OwnedPath;
  tracks: readonly MusicAlbumTrack[];
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

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive safe integer.`);
  }
}

const IMAGE_CONTENT_TYPES: ReadonlySet<string> = new Set<ImageContentType>([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function assertRepresentativeImage(image: RepresentativeImage): void {
  assertOwnedPath(image.path);
  if (!IMAGE_CONTENT_TYPES.has(image.contentType)) {
    throw new RangeError(
      `Representative image contentType must be image/jpeg, image/png, or image/webp; received ${image.contentType}.`,
    );
  }
  assertNonempty(image.alt, "Representative image alt text");
  assertPositiveInteger(image.width, "Representative image width");
  assertPositiveInteger(image.height, "Representative image height");
  if (image.caption !== undefined) {
    assertNonempty(image.caption, "Representative image caption");
  }
  if (image.credit !== undefined) {
    assertNonempty(image.credit, "Representative image credit");
  }
  if (image.social !== undefined) {
    assertOwnedPath(image.social.path);
    assertPositiveInteger(image.social.width, "Social image width");
    assertPositiveInteger(image.social.height, "Social image height");
  }
}

function assertSchemaParty(party: SchemaParty, label: string): void {
  assertNonempty(party.name, `${label} name`);
  if (party.path !== undefined) assertOwnedPath(party.path);
}

function assertHttpsUrl(value: string, label: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new RangeError(
      `${label} must be an absolute HTTPS URL; received ${value}.`,
    );
  }
  if (
    parsed.protocol !== "https:"
    || parsed.username.length > 0
    || parsed.password.length > 0
  ) {
    throw new RangeError(
      `${label} must be an absolute HTTPS URL; received ${value}.`,
    );
  }
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
  article.authors?.forEach((author) => {
    assertSchemaParty(author, "Article author");
  });
  if (article.publisher !== undefined) {
    assertSchemaParty(article.publisher, "Article publisher");
  }
  if (article.publishedTime !== undefined) {
    assertIsoDateTime(article.publishedTime, "Article publishedTime");
  }
  if (article.modifiedTime !== undefined) {
    assertIsoDateTime(article.modifiedTime, "Article modifiedTime");
  }
  if (
    article.publishedTime !== undefined
    && article.modifiedTime !== undefined
    && article.modifiedTime < article.publishedTime
  ) {
    throw new RangeError("Article modifiedTime cannot precede publishedTime.");
  }
  // The type forbids both parents; this also rejects untyped callers. Read
  // through a widened view so consumers without exactOptionalPropertyTypes
  // do not narrow the second check to never.
  const parents: Readonly<{ blogPath?: string | undefined; isPartOfPath?: string | undefined }> = article;
  if (parents.blogPath !== undefined && parents.isPartOfPath !== undefined) {
    throw new RangeError("An article can name blogPath or isPartOfPath, not both.");
  }
  if (parents.blogPath !== undefined) assertOwnedPath(parents.blogPath);
  if (parents.isPartOfPath !== undefined) assertOwnedPath(parents.isPartOfPath);
  return absoluteWebUrl(site.origin, article.canonicalPath);
}

function partyJsonLd(site: SearchSite, party: SchemaParty, label: string) {
  assertSchemaParty(party, label);
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
      : {
        author: article.authors.map((author) => (
          partyJsonLd(site, author, "Article author")
        )),
      }),
    ...(article.publisher === undefined
      ? {}
      : { publisher: partyJsonLd(site, article.publisher, "Article publisher") }),
    ...(article.isPartOfPath === undefined
      ? {}
      : {
        isPartOf: {
          "@id": `${absoluteWebUrl(site.origin, article.isPartOfPath)}#website`,
        },
      }),
    ...(article.blogPath === undefined
      ? {}
      : {
        isPartOf: {
          "@type": "Blog",
          "@id": `${absoluteWebUrl(site.origin, article.blogPath)}#blog`,
          url: absoluteWebUrl(site.origin, article.blogPath),
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

function socialImage(site: SearchSite, socialTitle: string) {
  // Without a described image, the alt text is the social title. Pass
  // socialImage.alt when the image at /opengraph-image shows something that
  // title does not describe.
  const image = site.socialImage ?? {
    alt: socialTitle,
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
    atomFeedPath?: OwnedPath;
    canonicalPath?: OwnedPath;
    /** The RSS 2.0 feed path. */
    feedPath?: OwnedPath;
  }> = {},
): Metadata {
  const canonicalPath = options.canonicalPath ?? "/";
  const canonical = absoluteWebUrl(site.origin, canonicalPath);
  const socialTitle = site.socialTitle ?? site.title;
  const image = socialImage(site, socialTitle);
  const feedTypes = {
    ...(options.feedPath === undefined
      ? {}
      : { "application/rss+xml": absoluteWebUrl(site.origin, options.feedPath) }),
    ...(options.atomFeedPath === undefined
      ? {}
      : { "application/atom+xml": absoluteWebUrl(site.origin, options.atomFeedPath) }),
  };
  const alternates = {
    canonical,
    ...(Object.keys(feedTypes).length === 0 ? {} : { types: feedTypes }),
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

function breadcrumbListItems(
  origin: SearchSite["origin"],
  steps: readonly BreadcrumbStep[],
) {
  if (steps.length === 0) {
    throw new RangeError("Breadcrumb schema requires at least one step.");
  }
  return steps.map((step, index) => {
    assertNonempty(step.name, "Breadcrumb step name");
    return {
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: absoluteWebUrl(origin, step.path),
    } as const;
  });
}

export function breadcrumbJsonLd(
  origin: SearchSite["origin"],
  steps: readonly BreadcrumbStep[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbListItems(origin, steps),
  } as const;
}

export function collectionPageJsonLd(
  site: SearchSite,
  page: CollectionPageDiscovery,
) {
  assertOwnedPath(page.path);
  assertNonempty(page.name, "Collection page name");
  assertNonempty(page.description, "Collection page description");
  page.items.forEach((item) => {
    assertNonempty(item.name, "Collection item name");
    assertHttpsUrl(item.url, "Collection item URL");
  });
  const url = absoluteWebUrl(site.origin, page.path);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name: page.name,
    description: page.description,
    ...(page.dateModified === undefined
      ? {}
      : { dateModified: page.dateModified }),
    inLanguage: site.language ?? "en-US",
    isPartOf: {
      "@id": `${absoluteWebUrl(site.origin, "/")}#website`,
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbListItems(site.origin, page.breadcrumb),
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: page.items.length,
      itemListElement: page.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: item.url,
      })),
    },
  } as const;
}

export function creativeWorkJsonLd(
  site: SearchSite,
  work: CreativeWorkDiscovery,
) {
  assertOwnedPath(work.path);
  assertNonempty(work.name, "Creative work name");
  assertNonempty(work.description, "Creative work description");
  if (work.author !== undefined) {
    assertSchemaParty(work.author, "Creative work author");
  }
  if (work.creditText !== undefined) {
    assertNonempty(work.creditText, "Creative work credit text");
  }
  const url = absoluteWebUrl(site.origin, work.path);
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${url}#work`,
    url,
    name: work.name,
    description: work.description,
    inLanguage: site.language ?? "en-US",
    ...(work.genre === undefined ? {} : { genre: work.genre }),
    ...(work.datePublished === undefined
      ? {}
      : { datePublished: work.datePublished }),
    isPartOf: {
      "@id": `${absoluteWebUrl(site.origin, "/")}#website`,
    },
    ...(work.author === undefined
      ? {}
      : { author: partyJsonLd(site, work.author, "Creative work author") }),
    ...(work.creditText === undefined
      ? {}
      : { creditText: work.creditText }),
  } as const;
}

export function musicAlbumJsonLd(
  site: SearchSite,
  album: MusicAlbumDiscovery,
) {
  assertOwnedPath(album.path);
  assertNonempty(album.name, "Album name");
  assertNonempty(album.description, "Album description");
  assertSchemaParty(album.byArtist, "Album artist");
  album.tracks.forEach((track) => {
    assertNonempty(track.name, "Album track name");
    if (track.durationSeconds !== undefined) {
      assertPositiveInteger(track.durationSeconds, "Album track duration");
    }
  });
  const url = absoluteWebUrl(site.origin, album.path);
  return {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    "@id": `${url}#album`,
    url,
    name: album.name,
    description: album.description,
    inLanguage: site.language ?? "en-US",
    byArtist: partyJsonLd(site, album.byArtist, "Album artist"),
    isPartOf: {
      "@id": `${absoluteWebUrl(site.origin, "/")}#website`,
    },
    numTracks: album.tracks.length,
    track: album.tracks.map((track, index) => ({
      "@type": "MusicRecording",
      position: index + 1,
      name: track.name,
      ...(track.durationSeconds === undefined
        ? {}
        : { duration: `PT${String(track.durationSeconds)}S` }),
    })),
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

export type BlogDiscovery = Readonly<{
  dateModified?: string;
  description: string;
  name: string;
  path: OwnedPath;
  publisher?: ArticleParty;
}>;

function articleLastModified(article: ArticleDiscovery): string | undefined {
  return article.modifiedTime ?? article.publishedTime;
}

function newestTimestamp(values: readonly (string | undefined)[]): string | undefined {
  let newest: string | undefined;
  for (const value of values) {
    if (value !== undefined && (newest === undefined || value > newest)) {
      newest = value;
    }
  }
  return newest;
}

function articlePostUrls(
  site: SearchSite,
  articles: readonly ArticleDiscovery[],
  label: string,
): (readonly [ArticleDiscovery, string])[] {
  const seen = new Set<string>();
  return articles.map((article) => {
    const url = articleUrl(site, article);
    if (seen.has(url)) {
      throw new RangeError(`${label} lists ${url} twice.`);
    }
    seen.add(url);
    return [article, url] as const;
  });
}

/**
 * Builds `Blog` JSON-LD for a visible blog index. Each listed post becomes a
 * `blogPost` reference whose `@id` matches the node `articleJsonLd` emits on
 * the post's own page.
 */
export function blogJsonLd(
  site: SearchSite,
  blog: BlogDiscovery,
  articles: readonly ArticleDiscovery[],
) {
  assertOwnedPath(blog.path);
  assertNonempty(blog.name, "Blog name");
  assertNonempty(blog.description, "Blog description");
  if (blog.publisher !== undefined) {
    assertSchemaParty(blog.publisher, "Blog publisher");
  }
  if (blog.dateModified !== undefined) {
    assertIsoDateTime(blog.dateModified, "Blog dateModified");
  }
  const url = absoluteWebUrl(site.origin, blog.path);
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${url}#blog`,
    url,
    name: blog.name,
    description: blog.description,
    inLanguage: site.language ?? "en-US",
    ...(blog.dateModified === undefined
      ? {}
      : { dateModified: blog.dateModified }),
    isPartOf: {
      "@id": `${absoluteWebUrl(site.origin, "/")}#website`,
    },
    ...(blog.publisher === undefined
      ? {}
      : { publisher: partyJsonLd(site, blog.publisher, "Blog publisher") }),
    blogPost: articlePostUrls(site, articles, "Blog JSON-LD").map(([article, postUrl]) => {
      if (article.blogPath !== undefined && article.blogPath !== blog.path) {
        throw new RangeError(
          `Blog JSON-LD lists ${postUrl}, whose blogPath names ${article.blogPath} instead of ${blog.path}.`,
        );
      }
      return {
        "@type": article.type,
        "@id": `${postUrl}#article`,
        url: postUrl,
        headline: article.title,
        description: article.description,
        ...(article.publishedTime === undefined
          ? {}
          : { datePublished: article.publishedTime }),
        ...(article.modifiedTime === undefined
          ? {}
          : { dateModified: article.modifiedTime }),
      } as const;
    }),
  } as const;
}

/**
 * Returns sitemap entries for a blog index and its articles, in the order
 * given. The index entry's `lastModified` is the newest article date unless
 * `lastModified` is passed.
 */
export function createBlogSitemapPaths(
  blog: Readonly<{ lastModified?: string; path: OwnedPath }>,
  articles: readonly ArticleDiscovery[],
): SitemapPath[] {
  assertOwnedPath(blog.path);
  if (blog.lastModified !== undefined) {
    assertIsoDateTime(blog.lastModified, "Blog sitemap lastModified");
  }
  const entries = articles.map(createArticleSitemapPath);
  const lastModified = blog.lastModified
    ?? newestTimestamp(articles.map(articleLastModified));
  return [
    {
      ...(lastModified === undefined ? {} : { lastModified }),
      path: blog.path,
    },
    ...entries,
  ];
}

export const ATOM_FEED_CONTENT_TYPE = "application/atom+xml; charset=utf-8";
export const RSS_FEED_CONTENT_TYPE = "application/rss+xml; charset=utf-8";

export type FeedDiscovery = Readonly<{
  /** Feed-level authors. Atom requires them unless every entry has its own. */
  authors?: readonly ArticleParty[];
  description: string;
  /** The HTML page the feed mirrors, such as `/blog`. */
  homePath: OwnedPath;
  /** The feed document's own path, such as `/blog/feed.xml`. */
  path: OwnedPath;
  rights?: string;
  title: string;
  /** Defaults to the newest entry date. Required when there are no entries. */
  updated?: string;
}>;

export type FeedEntry = Readonly<{
  authors?: readonly ArticleParty[];
  categories?: readonly string[];
  /** Full HTML body. It is escaped as text, never inserted as markup. */
  contentHtml?: string;
  enclosure?: Readonly<{ image: RepresentativeImage; length: number }>;
  modifiedTime?: string;
  path: OwnedPath;
  publishedTime: string;
  /** Plain-text summary. */
  summary?: string;
  title: string;
}>;

/**
 * Projects an article record into a feed entry. The article must carry a
 * `publishedTime`. Pass `imageLength` (the image file's byte length) to add
 * an image enclosure.
 */
export function createFeedEntry(
  article: ArticleDiscovery,
  options: Readonly<{
    contentHtml?: string;
    imageLength?: number;
    summary?: string;
  }> = {},
): FeedEntry {
  if (article.publishedTime === undefined) {
    throw new RangeError("Feed entries require the article's publishedTime.");
  }
  return {
    ...(article.authors === undefined ? {} : { authors: article.authors }),
    ...(article.keywords === undefined ? {} : { categories: article.keywords }),
    ...(options.contentHtml === undefined ? {} : { contentHtml: options.contentHtml }),
    ...(options.imageLength === undefined
      ? {}
      : { enclosure: { image: article.image, length: options.imageLength } }),
    ...(article.modifiedTime === undefined ? {} : { modifiedTime: article.modifiedTime }),
    path: article.canonicalPath,
    publishedTime: article.publishedTime,
    summary: options.summary ?? article.description,
    title: article.title,
  };
}

// XML 1.0 characters: tab, line feed, carriage return, U+0020–U+D7FF,
// U+E000–U+FFFD, and U+10000–U+10FFFF. Everything else, including lone
// surrogates, cannot appear in a well-formed document even as a reference.
// This scans UTF-16 code units directly because a Unicode regular
// expression class misses some lone surrogates in JavaScriptCore.
function invalidXmlCodeUnit(value: string): number | undefined {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        index += 1;
        continue;
      }
      return unit;
    }
    if (
      (unit >= 0xdc00 && unit <= 0xdfff)
      || unit === 0xfffe
      || unit === 0xffff
      || (unit < 0x20 && unit !== 0x9 && unit !== 0xa && unit !== 0xd)
    ) {
      return unit;
    }
  }
  return undefined;
}

function assertXmlCharacters(value: string, label: string): void {
  const unit = invalidXmlCodeUnit(value);
  if (unit !== undefined) {
    throw new RangeError(
      `${label} contains U+${unit.toString(16).toUpperCase().padStart(4, "0")}, which XML 1.0 cannot represent.`,
    );
  }
}

function xmlText(value: string, label: string): string {
  assertXmlCharacters(value, label);
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\r", "&#13;");
}

function xmlAttribute(value: string, label: string): string {
  return xmlText(value, label)
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;")
    .replaceAll("\t", "&#9;")
    .replaceAll("\n", "&#10;");
}

type CheckedFeedEntry = Readonly<{
  entry: FeedEntry;
  updated: string;
  url: string;
}>;

type CheckedFeed = Readonly<{
  entries: readonly CheckedFeedEntry[];
  homeUrl: string;
  selfUrl: string;
  updated: string;
}>;

function assertFeedParties(
  parties: readonly ArticleParty[] | undefined,
  label: string,
): void {
  parties?.forEach((party) => {
    assertSchemaParty(party, label);
  });
}

function checkFeed(
  site: SearchSite,
  feed: FeedDiscovery,
  entries: readonly FeedEntry[],
): CheckedFeed {
  parsedOrigin(site.origin);
  assertOwnedPath(feed.path);
  assertOwnedPath(feed.homePath);
  assertNonempty(feed.title, "Feed title");
  assertNonempty(feed.description, "Feed description");
  if (feed.rights !== undefined) assertNonempty(feed.rights, "Feed rights");
  assertFeedParties(feed.authors, "Feed author");
  if (feed.updated !== undefined) assertIsoDateTime(feed.updated, "Feed updated");
  const seen = new Set<string>();
  const checked = entries.map((entry): CheckedFeedEntry => {
    assertOwnedPath(entry.path);
    const url = absoluteWebUrl(site.origin, entry.path);
    if (seen.has(url)) {
      throw new RangeError(`Feed entries must be unique; received ${url} twice.`);
    }
    seen.add(url);
    assertNonempty(entry.title, "Feed entry title");
    assertIsoDateTime(entry.publishedTime, "Feed entry publishedTime");
    if (entry.modifiedTime !== undefined) {
      assertIsoDateTime(entry.modifiedTime, "Feed entry modifiedTime");
      if (entry.modifiedTime < entry.publishedTime) {
        throw new RangeError(
          `Feed entry ${url} has a modifiedTime before its publishedTime.`,
        );
      }
    }
    if (entry.summary !== undefined) assertNonempty(entry.summary, "Feed entry summary");
    if (entry.contentHtml !== undefined) {
      assertNonempty(entry.contentHtml, "Feed entry contentHtml");
    }
    assertFeedParties(entry.authors, "Feed entry author");
    const categories = new Set<string>();
    entry.categories?.forEach((category) => {
      assertNonempty(category, "Feed entry category");
      if (categories.has(category)) {
        throw new RangeError(`Feed entry ${url} lists category ${category} twice.`);
      }
      categories.add(category);
    });
    if (entry.enclosure !== undefined) {
      assertRepresentativeImage(entry.enclosure.image);
      if (!Number.isSafeInteger(entry.enclosure.length) || entry.enclosure.length < 0) {
        throw new RangeError("Feed enclosure length must be a nonnegative safe integer.");
      }
    }
    return { entry, updated: entry.modifiedTime ?? entry.publishedTime, url };
  });
  const newestEntry = newestTimestamp(checked.map((item) => item.updated));
  if (
    feed.updated !== undefined
    && newestEntry !== undefined
    && feed.updated < newestEntry
  ) {
    throw new RangeError("Feed updated cannot precede its newest entry.");
  }
  const updated = feed.updated ?? newestEntry;
  if (updated === undefined) {
    throw new RangeError("A feed without entries requires an explicit updated time.");
  }
  const ordered = [...checked].sort((left, right) => (
    left.entry.publishedTime === right.entry.publishedTime
      ? (left.url < right.url ? -1 : left.url > right.url ? 1 : 0)
      : (left.entry.publishedTime < right.entry.publishedTime ? 1 : -1)
  ));
  return {
    entries: ordered,
    homeUrl: absoluteWebUrl(site.origin, feed.homePath),
    selfUrl: absoluteWebUrl(site.origin, feed.path),
    updated,
  };
}

function atomAuthor(site: SearchSite, party: ArticleParty): string {
  const uri = party.path === undefined
    ? ""
    : `<uri>${xmlText(absoluteWebUrl(site.origin, party.path), "Author URL")}</uri>`;
  return `<author><name>${xmlText(party.name, "Author name")}</name>${uri}</author>`;
}

/**
 * Builds an Atom 1.0 document (RFC 4287). Entries appear newest first by
 * `publishedTime`, ties broken by URL. Every URL is absolute and derived from
 * `site.origin`. Throws when a value cannot be written as XML 1.0, when an
 * entry repeats, or when neither the feed nor an entry names an author.
 */
export function createAtomFeed(
  site: SearchSite,
  feed: FeedDiscovery,
  entries: readonly FeedEntry[],
): string {
  const checked = checkFeed(site, feed, entries);
  const feedHasAuthors = feed.authors !== undefined && feed.authors.length > 0;
  const lines = [
    "<?xml version=\"1.0\" encoding=\"utf-8\"?>",
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${xmlAttribute(site.language ?? "en-US", "Feed language")}">`,
    `<id>${xmlText(checked.selfUrl, "Feed id")}</id>`,
    `<title type="text">${xmlText(feed.title, "Feed title")}</title>`,
    `<subtitle type="text">${xmlText(feed.description, "Feed description")}</subtitle>`,
    `<updated>${checked.updated}</updated>`,
    `<link rel="self" type="application/atom+xml" href="${xmlAttribute(checked.selfUrl, "Feed URL")}"/>`,
    `<link rel="alternate" type="text/html" href="${xmlAttribute(checked.homeUrl, "Feed home URL")}"/>`,
    ...(feed.authors ?? []).map((party) => atomAuthor(site, party)),
    ...(feed.rights === undefined
      ? []
      : [`<rights type="text">${xmlText(feed.rights, "Feed rights")}</rights>`]),
  ];
  for (const { entry, updated, url } of checked.entries) {
    const authors = entry.authors ?? [];
    if (!feedHasAuthors && authors.length === 0) {
      throw new RangeError(
        `Atom entry ${url} needs an author because the feed names none.`,
      );
    }
    const enclosure = entry.enclosure === undefined
      ? []
      : [
        `<link rel="enclosure" type="${xmlAttribute(entry.enclosure.image.contentType, "Enclosure type")}" length="${String(entry.enclosure.length)}" href="${xmlAttribute(absoluteWebUrl(site.origin, entry.enclosure.image.path), "Enclosure URL")}"/>`,
      ];
    lines.push(
      "<entry>",
      `<id>${xmlText(url, "Entry id")}</id>`,
      `<title type="text">${xmlText(entry.title, "Entry title")}</title>`,
      `<link rel="alternate" type="text/html" href="${xmlAttribute(url, "Entry URL")}"/>`,
      ...enclosure,
      `<published>${entry.publishedTime}</published>`,
      `<updated>${updated}</updated>`,
      ...authors.map((party) => atomAuthor(site, party)),
      ...(entry.categories ?? []).map((category) => (
        `<category term="${xmlAttribute(category, "Entry category")}"/>`
      )),
      ...(entry.summary === undefined
        ? []
        : [`<summary type="text">${xmlText(entry.summary, "Entry summary")}</summary>`]),
      ...(entry.contentHtml === undefined
        ? []
        : [`<content type="html">${xmlText(entry.contentHtml, "Entry content")}</content>`]),
      "</entry>",
    );
  }
  lines.push("</feed>");
  return `${lines.join("\n")}\n`;
}

function rssDate(value: string): string {
  return new Date(value).toUTCString();
}

/**
 * Builds an RSS 2.0 document with `atom:link` self reference, `dc:creator`
 * for authors, and `content:encoded` for full HTML. Items appear newest first
 * by `publishedTime`, ties broken by URL. Entry authors fall back to feed
 * authors. Dates use the RFC 822 form RSS requires.
 */
export function createRssFeed(
  site: SearchSite,
  feed: FeedDiscovery,
  entries: readonly FeedEntry[],
): string {
  const checked = checkFeed(site, feed, entries);
  const lines = [
    "<?xml version=\"1.0\" encoding=\"utf-8\"?>",
    "<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\" xmlns:content=\"http://purl.org/rss/1.0/modules/content/\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\">",
    "<channel>",
    `<title>${xmlText(feed.title, "Feed title")}</title>`,
    `<link>${xmlText(checked.homeUrl, "Feed home URL")}</link>`,
    `<description>${xmlText(feed.description, "Feed description")}</description>`,
    `<language>${xmlText(site.language ?? "en-US", "Feed language")}</language>`,
    `<lastBuildDate>${rssDate(checked.updated)}</lastBuildDate>`,
    `<atom:link rel="self" type="application/rss+xml" href="${xmlAttribute(checked.selfUrl, "Feed URL")}"/>`,
    ...(feed.rights === undefined
      ? []
      : [`<copyright>${xmlText(feed.rights, "Feed rights")}</copyright>`]),
  ];
  for (const { entry, url } of checked.entries) {
    const authors = entry.authors ?? feed.authors ?? [];
    const enclosure = entry.enclosure === undefined
      ? []
      : [
        `<enclosure url="${xmlAttribute(absoluteWebUrl(site.origin, entry.enclosure.image.path), "Enclosure URL")}" length="${String(entry.enclosure.length)}" type="${xmlAttribute(entry.enclosure.image.contentType, "Enclosure type")}"/>`,
      ];
    lines.push(
      "<item>",
      `<title>${xmlText(entry.title, "Entry title")}</title>`,
      `<link>${xmlText(url, "Entry URL")}</link>`,
      `<guid isPermaLink="true">${xmlText(url, "Entry id")}</guid>`,
      `<pubDate>${rssDate(entry.publishedTime)}</pubDate>`,
      ...authors.map((party) => `<dc:creator>${xmlText(party.name, "Author name")}</dc:creator>`),
      ...(entry.categories ?? []).map((category) => (
        `<category>${xmlText(category, "Entry category")}</category>`
      )),
      ...(entry.summary === undefined
        ? []
        : [`<description>${xmlText(entry.summary, "Entry summary")}</description>`]),
      ...(entry.contentHtml === undefined
        ? []
        : [`<content:encoded>${xmlText(entry.contentHtml, "Entry content")}</content:encoded>`]),
      ...enclosure,
      "</item>",
    );
  }
  lines.push("</channel>", "</rss>");
  return `${lines.join("\n")}\n`;
}
