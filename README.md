# @hraness/web-discovery

`@hraness/web-discovery` builds a Next.js site's metadata, `robots.txt`, sitemap, JSON-LD, Atom and RSS feeds, web manifest, IndexNow payload, and social card from site and article records you define once. It rejects malformed origins, paths, and social-card colors before producing any output.

The package turns your records into metadata. Your application still supplies every product fact, route, date, image, and visual decision.

## Install

Pin a release tag:

```json
{
  "dependencies": {
    "@hraness/web-discovery": "github:hraness/web-discovery#v0.10.0"
  }
}
```

```sh
bun install
```

The package supports Next.js 16.2 through 16.x, React 19, and Node.js 20.9 or newer.

## Describe a site once for search, social, sitemaps, and structured data

Define the site once, then pass that record to the Next.js metadata routes and the JSON-LD builder:

```ts
import {
  createPublicRobots,
  createPublicSiteMetadata,
  createSitemap,
  websiteJsonLd,
  type SearchSite,
} from "@hraness/web-discovery";

export const site = {
  description: "Convert CSV files to charts in your browser.",
  name: "Example",
  origin: "https://example.com",
  title: "Example",
} as const satisfies SearchSite;

export const metadata = createPublicSiteMetadata(site);
export const robots = () => createPublicRobots(site.origin);
export const sitemap = () => createSitemap(site.origin, [
  { path: "/", priority: 1 },
  { path: "/guide" },
]);
export const schema = websiteJsonLd(site);
```

That example produces these values:

```text
canonical       https://example.com/
Open Graph URL  https://example.com/
social image    https://example.com/opengraph-image (1200 × 630)
image alt       Example
robots sitemap  https://example.com/sitemap.xml
sitemap URLs    https://example.com/, https://example.com/guide
schema @id      https://example.com/#website
```

The builders throw before producing any output when:

- the origin has a path or credentials
- a path points at another origin, carries a query or fragment, or would be rewritten by URL normalization
- the sitemap lists a URL twice
- a social-card color is not six-digit hex

Unless you pass `socialImage`, the Open Graph and Twitter image is your `/opengraph-image` route, and its alt text is the page's social title (`socialTitle`, or `title` when that is absent). Pass `socialImage` with its own `alt` when the image shows anything other than that title.

## Keep public and private discovery separate

Use `createPublicSiteMetadata` and `createPublicRobots` for a site that search engines should index. The public metadata includes the canonical URL, Open Graph, Twitter, and page-level indexing fields, all built from the same origin.

Use `createPrivateSiteMetadata` and `createPrivateRobots` for a private site. The private metadata sets page-level `noindex` and omits the canonical URL and social previews.

Crawler policy is not access control. A private route still needs authentication and authorization in the application.

## Use one image record for an article

Describe an article's image once, and the visible image, social crop, metadata, schema, feed enclosure, and image sitemap entry all come from that record:

```ts
import {
  articleJsonLd,
  createArticleMetadata,
  createArticleSitemapPath,
  createAtomImageEnclosure,
  type ArticleDiscovery,
} from "@hraness/web-discovery";

const article = {
  canonicalPath: "/guides/one-image-everywhere",
  description: "How one image record supplies the page image, social preview, feed, and sitemap.",
  image: {
    alt: "Blue and orange modules connected across a work surface.",
    caption: "The same image appears on the page, in social previews, and in the feed.",
    contentType: "image/webp",
    credit: "Editorial illustration by Example.",
    height: 864,
    path: "/images/guides/one-image-everywhere.webp",
    social: {
      height: 630,
      path: "/images/guides/one-image-everywhere-social.webp",
      width: 1200,
    },
    width: 1536,
  },
  publishedTime: "2026-08-29T00:00:00.000Z",
  title: "One representative image, everywhere",
  type: "BlogPosting",
} as const satisfies ArticleDiscovery;

export const articleMetadata = createArticleMetadata(site, article);
export const articleSchema = articleJsonLd(site, article);
export const sitemapEntry = createArticleSitemapPath(article);
export const atomImage = createAtomImageEnclosure(site.origin, article.image);
```

Render that image and caption in the page's initial HTML. The social crop appears in social metadata; the visible article image appears in schema, Atom, and the image sitemap. RSS callers can add the checked byte length with `createRssImageEnclosure`.

Keep asset hashes, prompts, generation records, and source records in your application's own registry. The package does not read or emit them.

## Publish a blog index, feeds, and sitemap entries

The same article records produce the blog's `Blog` schema, its sitemap entries, and Atom and RSS documents. Add `blogPath` to each article so its `BlogPosting` schema names the blog it belongs to:

```ts
import {
  blogJsonLd,
  createAtomFeed,
  createBlogSitemapPaths,
  createFeedEntry,
  createRssFeed,
  type ArticleDiscovery,
  type FeedDiscovery,
} from "@hraness/web-discovery";

const post = {
  authors: [{ kind: "Organization", name: "Example", path: "/" }],
  blogPath: "/blog",
  canonicalPath: "/blog/first-post",
  description: "What the first post explains.",
  image: {
    alt: "A chart drawn from a small CSV file.",
    contentType: "image/png",
    height: 630,
    path: "/blog/first-post.png",
    width: 1200,
  },
  publishedTime: "2026-09-23T00:00:00.000Z",
  publisher: { kind: "Organization", name: "Example", path: "/" },
  title: "The first post",
  type: "BlogPosting",
} as const satisfies ArticleDiscovery;

const feed = {
  authors: [{ kind: "Organization", name: "Example", path: "/" }],
  description: "Posts from Example.",
  homePath: "/blog",
  path: "/blog/feed.xml",
  title: "Example blog",
} as const satisfies FeedDiscovery;

export const blogSchema = blogJsonLd(site, {
  description: "Posts from Example.",
  name: "Example blog",
  path: "/blog",
}, [post]);
export const blogSitemapPaths = createBlogSitemapPaths({ path: "/blog" }, [post]);
export const atom = createAtomFeed(site, feed, [
  createFeedEntry(post, { contentHtml: "<p>The post body.</p>" }),
]);
export const rss = createRssFeed(site, feed, [createFeedEntry(post)]);
```

`articleJsonLd` then sets `isPartOf` to the `Blog` node at `https://example.com/blog#blog`, and each `blogPost` in `blogJsonLd` carries the same `@id` as the post's own schema. An article names either `blogPath` or the older `isPartOfPath`, not both, and `blogJsonLd` rejects a post whose `blogPath` names a different blog.

`createBlogSitemapPaths` returns the index entry followed by one entry per article with its image and `lastModified` date (`modifiedTime`, or `publishedTime` when that is absent). The index is dated by its newest article unless you pass `lastModified`. Pass the result to `createSitemap`.

The feed builders return a complete XML document as a string, so they work in a Next.js route handler, a static build script, or any other runtime. Serve them with `ATOM_FEED_CONTENT_TYPE` or `RSS_FEED_CONTENT_TYPE`, and advertise them with `createPublicSiteMetadata(site, { atomFeedPath, feedPath })`, where `feedPath` is the RSS path. Both documents:

- use absolute URLs from `site.origin`, with the entry URL as the Atom `id` and the RSS `guid`
- list entries newest first by `publishedTime`, whatever order you pass
- date the feed by its newest entry (`modifiedTime`, or `publishedTime`) unless you pass `updated`
- write `summary` as plain text and `contentHtml` as escaped HTML, which feed readers decode and render
- add an image enclosure when you pass `imageLength`, the image file's size in bytes

RSS writes authors as `dc:creator`, falls back to the feed's authors for entries without their own, and rounds dates to whole seconds because RSS dates carry no fractions. Atom requires an author on the feed or on every entry.

The feed builders throw before producing any output when:

- a value contains a character XML 1.0 cannot represent, such as a control character or an unpaired surrogate
- two entries share a URL, or one entry repeats a category
- a date is not a canonical UTC timestamp such as `2026-09-23T00:00:00.000Z`, `modifiedTime` precedes `publishedTime`, or `updated` precedes the newest entry
- the feed has no entries and no `updated` time

## Render safe JSON-LD

```tsx
import { websiteJsonLd } from "@hraness/web-discovery";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";

export function WebsiteSchema() {
  return <JsonLdScript data={websiteJsonLd(site)} id="website-schema" />;
}
```

A party (author, publisher, or artist) takes either a `path` on this site or an absolute HTTPS `url` for a party whose home is elsewhere, plus optional `sameAs` profile URLs:

```ts
const publisher = {
  kind: "Organization",
  name: "Example",
  url: "https://example.org",
  sameAs: ["https://github.com/example"],
} as const;
```

`JsonLdScript` escapes `<`, `>`, `&`, and Unicode line separators for an HTML script context. Emit schema only when the page visibly supports every claim it contains.

Beyond `websiteJsonLd`, `articleJsonLd`, and `blogJsonLd`, the root export carries `breadcrumbJsonLd`, `collectionPageJsonLd`, `creativeWorkJsonLd`, `musicAlbumJsonLd`, `profilePageJsonLd`, and `webApplicationJsonLd` for pages that visibly publish a trail, a curated list, a work, an album, a person's profile, or a web app. Each builder emits the facts you pass and adds no dates, authors, ratings, or reviews. `webApplicationJsonLd` also sets `operatingSystem` to `Any` and, when you pass `free: true`, adds a zero-price USD offer.

## Generate a deterministic social card

```tsx
import {
  createSocialImageResponse,
  socialImageContentType as contentType,
  socialImageSize as size,
} from "@hraness/web-discovery/social-image";

export { contentType, size };

export default function OpenGraphImage() {
  return createSocialImageResponse({
    description: "Convert CSV files to charts in your browser.",
    domain: "example.com",
    title: "Example",
  });
}
```

The card comes in two layouts. The product layout puts a large icon tile on the left and, beside it, the name, a description of up to three lines, and the domain. The page layout puts a small lockup of the icon, the name, and the domain at the top, the eyebrow above a large headline, and the description beneath it. A card uses the page layout when you pass a `headline` that differs from `title`, and the product layout otherwise. Pass `layout: "product"` or `layout: "page"` to choose.

This is a visible change for cards that pass a page title such as `"How Example works | Example"` without a `headline`. Before v0.10.0 the card showed that title as a large headline. It now uses the product layout and shows the title, without its brand segment, in the name slot, in up to three lines at 48 pixels or larger, then ends it in an ellipsis. Pass `layout: "page"` to keep a headline-first card.

The headline is `headline` when you pass it. Otherwise it is `title` with one trailing brand segment removed, such as ` | Example` or ` · example.com`, when that segment matches the eyebrow, the domain, or the domain without its last label (`example`), ignoring case. Other titles appear unchanged.

Pass `icon` to show your product icon in the tile:

```tsx
createSocialImageResponse({
  description: "Convert CSV files to charts in your browser.",
  domain: "example.com",
  icon: { kind: "mark", src: "data:image/svg+xml,..." },
  theme: { accent: "#2474D4" },
  title: "Example",
});
```

`src` must be a `data:` URL holding an SVG or a base64 PNG. The card throws before rendering for any other value, including remote URLs and file paths. A `mark` icon is a one-colour glyph: the card paints it white on a tile of the theme accent, or a deep shade of the accent when white would be hard to read. An `app` icon is a finished app icon: the card shows its own colours in a rounded tile and never repaints it. Without `icon`, the tile shows your `mark` element in white, or the first letter of the title.

Text is at least 30 pixels tall. Lines break at whole words, short words stay with the word after them, and text that would not fit ends in an ellipsis instead of being cut off. The card keeps your capitalization. The accent-coloured domain and eyebrow are darkened or lightened until they meet a 4.5:1 contrast ratio against the background.

The 1200 × 630 PNG embeds Nebula Sans Book and Bold from the `@hraness/design-kit/fonts/nebula-sans/social` export of Design Kit v0.5.0. The renderer fetches no remote assets and reads no files at runtime. Its layout is inline styles passed to Next.js `ImageResponse`, so you load no stylesheet for it. Pass six-digit hex theme colors to match your application.

Static sites without a Next.js runtime import the same layout through `@hraness/web-discovery/social-image/card`, which carries no `next` import. `createSocialImageCard` returns the React element, its embedded fonts, and the card dimensions so a checked script can rasterize with `satori` and `@resvg/resvg-js`:

```ts
import { createSocialImageCard } from "@hraness/web-discovery/social-image/card";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const card = createSocialImageCard({
  description: "Convert CSV files to charts in your browser.",
  domain: "example.com",
  title: "Example",
});
const svg = await satori(card.element, {
  fonts: card.fonts.map((font) => ({
    data: font.data,
    name: font.name,
    style: font.style,
    weight: font.weight,
  })),
  height: card.height,
  width: card.width,
});
const png = new Resvg(svg).render().asPng();
```

Install `satori` and `@resvg/resvg-js` in your application; the package does not depend on them.

## Declare a site once and render every card from it

Describe the site in one module, then render the home card and each page card from it:

```ts
// app/social.ts
import { defineSocialImageSite } from "@hraness/web-discovery/social-image";

export const socialSite = defineSocialImageSite({
  description: "Convert CSV files to charts in your browser.",
  domain: "example.com",
  icon: { kind: "app", src: "data:image/png;base64,..." },
  name: "Example",
  theme: { accent: "#2474D4", background: "#F8F7F4", foreground: "#1C1A18", muted: "#5E5A55" },
});
```

```ts
// app/opengraph-image.tsx
import {
  createSiteSocialImageResponse,
  socialImageAlt,
  socialImageContentType,
  socialImageSize,
} from "@hraness/web-discovery/social-image";
import { socialSite } from "./social";

export const alt = socialImageAlt(socialSite);
export const contentType = socialImageContentType;
export const size = socialImageSize;

export default function Image() {
  return createSiteSocialImageResponse(socialSite);
}
```

A blog post or profile page passes its own copy, which switches the card to the page layout:

```ts
createSiteSocialImageResponse(socialSite, {
  description: post.summary,
  eyebrow: "Blog",
  headline: post.title,
});
```

`defineSocialImageSite` checks the name, domain, description, and icon when the module loads, so a bad icon fails the build instead of a share preview. Static sites build the same details with `socialImageSiteDetails` from `@hraness/web-discovery/social-image/card` and pass them to `createSocialImageCard`.

## Pick an import

| Import | Use it for | Scope |
| --- | --- | --- |
| `@hraness/web-discovery` | URLs, public and private metadata and robots, sitemaps, manifests, IndexNow, JSON-LD builders, and Atom and RSS feeds | Data builders with no product copy |
| `@hraness/web-discovery/json-ld` | One safely serialized React `<script type="application/ld+json">` | React rendering only |
| `@hraness/web-discovery/social-image` | One deterministic Next.js `ImageResponse` | Next.js social-image rendering only |
| `@hraness/web-discovery/social-image/card` | The same layout as a React element with fonts and dimensions | Next.js-free scripted rendering |

The root package does not crawl a site, inspect rendered HTML, submit an IndexNow request, generate editorial artwork, or decide whether a claim is true. Your application does those things.

## Run the checks

```sh
bun install --frozen-lockfile
bun run check
```

`bun run check` validates the repository inventory, checks the four package entry points, the dependency and peer dependency pins, and release workflow permissions, scans the repository for private paths and identities, lints and typechecks the source, rebuilds the four committed runtime exports, runs the example and property tests, and packs the package. The package smoke then imports every runtime export, renders a PNG through `ImageResponse` and again through `satori` plus `@resvg/resvg-js` with genuine Node 24, typechecks installed consumers under Bundler and NodeNext resolution, and completes a real Next.js production build.

## Questions

### Why not use the Next.js metadata files directly?

For one simple site, use them. Next.js builds `robots.txt`, the sitemap, the manifest, and Open Graph images from files such as `app/robots.ts` and `app/sitemap.ts`, and [schema-dts](https://github.com/google/schema-dts) types JSON-LD. This package feeds those routes from one validated site record, rejects malformed origins, paths, and card colors before producing output, and adds RSS and Atom feeds and an IndexNow payload, which Next.js does not build. [next-sitemap](https://github.com/iamvishnusankar/next-sitemap) writes sitemaps after the build, and [next-seo](https://github.com/garmeeh/next-seo) renders tags and JSON-LD from components. Checked on 2026-09-28.

### Can `robots.txt` make a page private?

No. Use authentication and authorization in the application. The private builders ask search engines not to crawl or index the site; they do not stop anyone from opening it.

### Does the package verify that structured data is true?

It validates the record's shape and emits what you pass. Your page must show the same facts in visible content, and you should not pass invented reviews, prices, dates, authorship, or other claims.

### Can paths include tracking queries or fragments?

No. Paths are canonical root-relative paths such as `/guide`. The builders reject queries, fragments, foreign origins, protocol-relative URLs, and spellings that URL parsing would normalize.

### Can a site draw its own social card?

Use the shared card. Every Hraness site renders its social images through this package, so the layout, type, and contrast rules stay the same everywhere and improve for every site at once. A site supplies its name, description, domain, icon, and theme colors, and nothing else.

## Contribute

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before changing a public builder. Add a deterministic example for each regression and a property test for every parsing, normalization, ordering, serialization, or round-trip law.

Report suspected vulnerabilities privately as described in [SECURITY.md](./SECURITY.md).

## License

MIT

Maintained by [Hraness](https://hraness.com).
