# Web Discovery

`@hraness/web-discovery` builds a Next.js site's metadata, `robots.txt`, sitemap, JSON-LD, web manifest, IndexNow payload, and social card from site and article records you define once. It rejects malformed origins, paths, and social-card colors before producing any output.

The package turns your records into metadata. Your application still supplies every product fact, route, date, image, and visual decision.

## Install

Pin a release tag:

```json
{
  "dependencies": {
    "@hraness/web-discovery": "github:hraness/web-discovery#v0.7.0"
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

## Render safe JSON-LD

```tsx
import { websiteJsonLd } from "@hraness/web-discovery";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";

export function WebsiteSchema() {
  return <JsonLdScript data={websiteJsonLd(site)} id="website-schema" />;
}
```

`JsonLdScript` escapes `<`, `>`, `&`, and Unicode line separators for an HTML script context. Emit schema only when the page visibly supports every claim it contains.

Beyond `websiteJsonLd` and `articleJsonLd`, the root export carries `breadcrumbJsonLd`, `collectionPageJsonLd`, `creativeWorkJsonLd`, `musicAlbumJsonLd`, `profilePageJsonLd`, and `webApplicationJsonLd` for pages that visibly publish a trail, a curated list, a work, an album, a person's profile, or a web app. Each builder emits the facts you pass and adds no dates, authors, ratings, or reviews. `webApplicationJsonLd` also sets `operatingSystem` to `Any` and, when you pass `free: true`, adds a zero-price USD offer.

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

The card shows the eyebrow (or the domain) at the top, a large headline, the description, and the domain at the bottom. The headline is `headline` when you pass it. Otherwise it is `title` with one trailing brand segment removed, such as ` | Example` or ` · example.com`, when that segment matches the eyebrow, the domain, or the domain without its last label (`example`), ignoring case. Other titles appear unchanged.

The 1200 × 630 PNG embeds Nebula Sans Book and Bold from the `@hraness/design-kit/fonts/nebula-sans/social` export of Design Kit v0.5.0. The renderer fetches no remote assets and reads no files at runtime. Its layout is inline styles passed to Next.js `ImageResponse`, so you load no stylesheet for it. Pass six-digit hex theme colors to match your application, and write your own card when it needs serif or monospace type.

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

## Pick an import

| Import | Use it for | Scope |
| --- | --- | --- |
| `@hraness/web-discovery` | URLs, public and private metadata and robots, sitemaps, manifests, IndexNow, JSON-LD builders, and feed images | Data builders with no product copy |
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

### Can `robots.txt` make a page private?

No. Use authentication and authorization in the application. The private builders ask search engines not to crawl or index the site; they do not stop anyone from opening it.

### Does the package verify that structured data is true?

It validates the record's shape and emits what you pass. Your page must show the same facts in visible content, and you should not pass invented reviews, prices, dates, authorship, or other claims.

### Can paths include tracking queries or fragments?

No. Paths are canonical root-relative paths such as `/guide`. The builders reject queries, fragments, foreign origins, protocol-relative URLs, and spellings that URL parsing would normalize.

### Does every site need the shared social-card typography?

No. The shared renderer draws sans-serif cards. Write your own renderer when a product's typography or layout is part of its identity.

## Contribute

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before changing a public builder. Add a deterministic example for each regression and a property test for every parsing, normalization, ordering, serialization, or round-trip law.

Report suspected vulnerabilities privately as described in [SECURITY.md](./SECURITY.md).

## License

MIT
