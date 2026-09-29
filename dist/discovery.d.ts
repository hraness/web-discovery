import type { Metadata, MetadataRoute } from "next";
export declare const LARGE_SOCIAL_IMAGE: {
    readonly height: 630;
    readonly width: 1200;
};
export declare const INDEXABLE_ROBOTS: {
    readonly follow: true;
    readonly googleBot: {
        readonly follow: true;
        readonly index: true;
        readonly "max-image-preview": "large";
        readonly "max-snippet": -1;
        readonly "max-video-preview": -1;
    };
    readonly index: true;
};
export declare const NOINDEX_ROBOTS: {
    readonly follow: false;
    readonly googleBot: {
        readonly follow: false;
        readonly index: false;
        readonly noarchive: true;
        readonly nosnippet: true;
    };
    readonly index: false;
};
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
export type ArticleParty = SchemaParty & Readonly<{
    kind: "Organization" | "Person";
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
}> & (Readonly<{
    blogPath?: never;
    isPartOfPath?: OwnedPath;
}> | Readonly<{
    blogPath: OwnedPath;
    isPartOfPath?: never;
}>);
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
    /** A page on this site that represents the party. Mutually exclusive with `url`. */
    path?: OwnedPath;
    /** An absolute HTTPS URL for a party whose canonical home is another site. */
    url?: string;
    /** Absolute HTTPS profile URLs that identify the same party, such as a GitHub organization. */
    sameAs?: readonly string[];
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
export declare function parseOwnedPath(path: string): OwnedPath;
export declare function absoluteWebUrl(origin: SearchSite["origin"], path: OwnedPath): string;
export declare function representativeImageUrls(origin: SearchSite["origin"], image: RepresentativeImage): {
    readonly article: {
        readonly alt: string;
        readonly height: number;
        readonly type: ImageContentType;
        readonly url: string;
        readonly width: number;
    };
    readonly social: {
        readonly alt: string;
        readonly height: number;
        readonly type: ImageContentType;
        readonly url: string;
        readonly width: number;
    };
};
export declare function createArticleMetadata(site: SearchSite, article: ArticleDiscovery): Metadata;
export declare function articleJsonLd(site: SearchSite, article: ArticleDiscovery): {
    readonly citation?: `https://${string}`[];
    readonly keywords?: string[];
    readonly articleSection?: string;
    readonly inLanguage: string;
    readonly isAccessibleForFree?: boolean;
    readonly isPartOf?: {
        "@id": string;
        "@type"?: never;
        url?: never;
    } | {
        "@type": string;
        "@id": string;
        url: string;
    };
    readonly publisher?: {
        readonly sameAs?: string[];
        readonly url?: string;
        readonly "@type": "Organization" | "Person" | "MusicGroup";
        readonly name: string;
    };
    readonly author?: {
        readonly sameAs?: string[];
        readonly url?: string;
        readonly "@type": "Organization" | "Person" | "MusicGroup";
        readonly name: string;
    }[];
    readonly dateModified?: string;
    readonly datePublished?: string;
    readonly "@context": "https://schema.org";
    readonly "@type": "Article" | "BlogPosting" | "NewsArticle";
    readonly "@id": `${string}#article`;
    readonly mainEntityOfPage: {
        readonly "@type": "WebPage";
        readonly "@id": string;
    };
    readonly headline: string;
    readonly description: string;
    readonly image: {
        readonly creditText?: string;
        readonly caption?: string;
        readonly "@type": "ImageObject";
        readonly contentUrl: string;
        readonly url: string;
        readonly description: string;
        readonly height: number;
        readonly width: number;
        readonly representativeOfPage: true;
    };
};
export declare function createArticleSitemapPath(article: ArticleDiscovery): SitemapPath;
export declare function createAtomImageEnclosure(origin: SearchSite["origin"], image: RepresentativeImage): AtomImageEnclosure;
export declare function createRssImageEnclosure(origin: SearchSite["origin"], image: RepresentativeImage, length: number): RssImageEnclosure;
export declare function createPublicSiteMetadata(site: SearchSite, options?: Readonly<{
    atomFeedPath?: OwnedPath;
    canonicalPath?: OwnedPath;
    /** The RSS 2.0 feed path. */
    feedPath?: OwnedPath;
}>): Metadata;
export declare function createPrivateSiteMetadata(site: SearchSite): Metadata;
export declare function createPublicRobots(origin: SearchSite["origin"], options?: Readonly<{
    disallow?: readonly OwnedPath[];
}>): MetadataRoute.Robots;
export declare function createPrivateRobots(): MetadataRoute.Robots;
export declare function createSitemap(origin: SearchSite["origin"], paths: readonly SitemapPath[]): MetadataRoute.Sitemap;
export declare function createWebManifest(site: SearchSite, colors: Readonly<{
    background: string;
    theme: string;
}>): MetadataRoute.Manifest;
export declare function createIndexNowPayload(origin: SearchSite["origin"], key: string, paths: readonly OwnedPath[]): IndexNowPayload;
export declare function websiteJsonLd(site: SearchSite): {
    readonly "@context": "https://schema.org";
    readonly "@type": "WebSite";
    readonly "@id": `${string}#website`;
    readonly url: string;
    readonly name: string;
    readonly description: string;
    readonly inLanguage: string;
};
export declare function webApplicationJsonLd(site: SearchSite, application: Readonly<{
    browserRequirements?: string;
    category: string;
    features?: readonly string[];
    free?: boolean;
}>): {
    readonly offers?: {
        "@type": string;
        price: number;
        priceCurrency: string;
    };
    readonly isAccessibleForFree?: boolean;
    readonly featureList?: string[];
    readonly browserRequirements?: string;
    readonly "@context": "https://schema.org";
    readonly "@type": "WebApplication";
    readonly name: string;
    readonly url: string;
    readonly description: string;
    readonly applicationCategory: string;
    readonly operatingSystem: "Any";
};
export declare function profilePageJsonLd(site: SearchSite, person: Readonly<{
    image?: OwnedPath;
    name: string;
    sameAs?: readonly string[];
}>): {
    readonly "@context": "https://schema.org";
    readonly "@type": "ProfilePage";
    readonly "@id": `${string}#profile`;
    readonly url: string;
    readonly name: string;
    readonly description: string;
    readonly mainEntity: {
        readonly sameAs?: string[];
        readonly image?: string;
        readonly "@type": "Person";
        readonly "@id": `${string}#person`;
        readonly name: string;
        readonly url: string;
        readonly description: string;
    };
};
export declare function breadcrumbJsonLd(origin: SearchSite["origin"], steps: readonly BreadcrumbStep[]): {
    readonly "@context": "https://schema.org";
    readonly "@type": "BreadcrumbList";
    readonly itemListElement: {
        readonly "@type": "ListItem";
        readonly position: number;
        readonly name: string;
        readonly item: string;
    }[];
};
export declare function collectionPageJsonLd(site: SearchSite, page: CollectionPageDiscovery): {
    readonly inLanguage: string;
    readonly isPartOf: {
        readonly "@id": `${string}#website`;
    };
    readonly breadcrumb: {
        readonly "@type": "BreadcrumbList";
        readonly itemListElement: {
            readonly "@type": "ListItem";
            readonly position: number;
            readonly name: string;
            readonly item: string;
        }[];
    };
    readonly mainEntity: {
        readonly "@type": "ItemList";
        readonly numberOfItems: number;
        readonly itemListElement: {
            "@type": string;
            position: number;
            name: string;
            url: `https://${string}`;
        }[];
    };
    readonly dateModified?: string;
    readonly "@context": "https://schema.org";
    readonly "@type": "CollectionPage";
    readonly "@id": `${string}#collection`;
    readonly url: string;
    readonly name: string;
    readonly description: string;
};
export declare function creativeWorkJsonLd(site: SearchSite, work: CreativeWorkDiscovery): {
    readonly creditText?: string;
    readonly author?: {
        readonly sameAs?: string[];
        readonly url?: string;
        readonly "@type": "Organization" | "Person" | "MusicGroup";
        readonly name: string;
    };
    readonly isPartOf: {
        readonly "@id": `${string}#website`;
    };
    readonly datePublished?: string;
    readonly genre?: string;
    readonly "@context": "https://schema.org";
    readonly "@type": "CreativeWork";
    readonly "@id": `${string}#work`;
    readonly url: string;
    readonly name: string;
    readonly description: string;
    readonly inLanguage: string;
};
export declare function musicAlbumJsonLd(site: SearchSite, album: MusicAlbumDiscovery): {
    readonly "@context": "https://schema.org";
    readonly "@type": "MusicAlbum";
    readonly "@id": `${string}#album`;
    readonly url: string;
    readonly name: string;
    readonly description: string;
    readonly inLanguage: string;
    readonly byArtist: {
        readonly sameAs?: string[];
        readonly url?: string;
        readonly "@type": "Organization" | "Person" | "MusicGroup";
        readonly name: string;
    };
    readonly isPartOf: {
        readonly "@id": `${string}#website`;
    };
    readonly numTracks: number;
    readonly track: {
        duration?: string;
        "@type": string;
        position: number;
        name: string;
    }[];
};
export declare function serializeJsonLd(value: unknown): string;
export type BlogDiscovery = Readonly<{
    dateModified?: string;
    description: string;
    name: string;
    path: OwnedPath;
    publisher?: ArticleParty;
}>;
/**
 * Builds `Blog` JSON-LD for a visible blog index. Each listed post becomes a
 * `blogPost` reference whose `@id` matches the node `articleJsonLd` emits on
 * the post's own page.
 */
export declare function blogJsonLd(site: SearchSite, blog: BlogDiscovery, articles: readonly ArticleDiscovery[]): {
    readonly blogPost: {
        readonly dateModified?: string;
        readonly datePublished?: string;
        readonly "@type": "Article" | "BlogPosting" | "NewsArticle";
        readonly "@id": `${string}#article`;
        readonly url: string;
        readonly headline: string;
        readonly description: string;
    }[];
    readonly publisher?: {
        readonly sameAs?: string[];
        readonly url?: string;
        readonly "@type": "Organization" | "Person" | "MusicGroup";
        readonly name: string;
    };
    readonly isPartOf: {
        readonly "@id": `${string}#website`;
    };
    readonly dateModified?: string;
    readonly "@context": "https://schema.org";
    readonly "@type": "Blog";
    readonly "@id": `${string}#blog`;
    readonly url: string;
    readonly name: string;
    readonly description: string;
    readonly inLanguage: string;
};
/**
 * Returns sitemap entries for a blog index and its articles, in the order
 * given. The index entry's `lastModified` is the newest article date unless
 * `lastModified` is passed.
 */
export declare function createBlogSitemapPaths(blog: Readonly<{
    lastModified?: string;
    path: OwnedPath;
}>, articles: readonly ArticleDiscovery[]): SitemapPath[];
export declare const ATOM_FEED_CONTENT_TYPE = "application/atom+xml; charset=utf-8";
export declare const RSS_FEED_CONTENT_TYPE = "application/rss+xml; charset=utf-8";
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
    enclosure?: Readonly<{
        image: RepresentativeImage;
        length: number;
    }>;
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
export declare function createFeedEntry(article: ArticleDiscovery, options?: Readonly<{
    contentHtml?: string;
    imageLength?: number;
    summary?: string;
}>): FeedEntry;
/**
 * Builds an Atom 1.0 document (RFC 4287). Entries appear newest first by
 * `publishedTime`, ties broken by URL. Every URL is absolute and derived from
 * `site.origin`. Throws when a value cannot be written as XML 1.0, when an
 * entry repeats, or when neither the feed nor an entry names an author.
 */
export declare function createAtomFeed(site: SearchSite, feed: FeedDiscovery, entries: readonly FeedEntry[]): string;
/**
 * Builds an RSS 2.0 document with `atom:link` self reference, `dc:creator`
 * for authors, and `content:encoded` for full HTML. Items appear newest first
 * by `publishedTime`, ties broken by URL. Entry authors fall back to feed
 * authors. Dates use the RFC 822 form RSS requires.
 */
export declare function createRssFeed(site: SearchSite, feed: FeedDiscovery, entries: readonly FeedEntry[]): string;
//# sourceMappingURL=discovery.d.ts.map