# Web Discovery

Give search engines, social previews, feeds, and people the same account of a Next.js site. `@hraness/web-discovery` derives metadata, crawler policy, sitemaps, JSON-LD, manifests, IndexNow payloads, and social cards from checked consumer-owned records.

The package owns the projection. Your application still owns every product fact, route, date, image, and visual decision.

## Install the reviewed release

Pin the immutable `v0.3.0` tag:

```json
{
  "dependencies": {
    "@hraness/web-discovery": "github:hraness/web-discovery#v0.3.0"
  }
}
```

```sh
bun install
```

The package supports Next.js 16.2 through 16.x, React 19, and Node.js 20.9 or newer.

## Prove one site across four surfaces

Define the public facts once, then pass that same record to the Next.js metadata routes and structured-data renderer:

```ts
import {
  createPublicRobots,
  createPublicSiteMetadata,
  createSitemap,
  websiteJsonLd,
  type SearchSite,
} from "@hraness/web-discovery";

export const site = {
  description: "A useful public browser tool.",
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

That example produces one inspectable trace:

```text
canonical       https://example.com/
Open Graph URL  https://example.com/
social image    https://example.com/opengraph-image (1200 × 630)
robots sitemap  https://example.com/sitemap.xml
sitemap URLs    https://example.com/, https://example.com/guide
schema @id      https://example.com/#website
```

An origin with a path or credentials fails before output. So does a foreign, query-bearing, fragment-bearing, or normalized owned path. Duplicate sitemap URLs and malformed social-card colors fail closed as well.

## Keep public and private discovery separate

Use `createPublicSiteMetadata` and `createPublicRobots` for an indexable surface. The public metadata includes the canonical, Open Graph, Twitter, and page-level indexing fields derived from the same origin.

Use `createPrivateSiteMetadata` and `createPrivateRobots` for a private surface. The private metadata applies page-level `noindex` and omits canonical and social previews.

Crawler policy is not access control. A private route still needs authentication and authorization in the application.

## Project one article image everywhere

Keep the visible image, social crop, metadata, schema, feed enclosure, and image sitemap entry bound to one consumer-owned record:

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
  description: "How one checked image record drives every discovery surface.",
  image: {
    alt: "Blue and orange modules connected across a work surface.",
    caption: "One representative image record, projected consistently.",
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

Asset hashes, prompts, generation receipts, and source provenance stay in the application's registry. They are review evidence, not product-neutral discovery metadata.

## Render safe JSON-LD

```tsx
import { websiteJsonLd } from "@hraness/web-discovery";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";

export function WebsiteSchema() {
  return <JsonLdScript data={websiteJsonLd(site)} id="website-schema" />;
}
```

`JsonLdScript` escapes `<`, `>`, `&`, and Unicode line separators for an HTML script context. Emit schema only when the page visibly supports every claim it contains.

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
    description: "A useful public browser tool.",
    domain: "example.com",
    title: "Example",
  });
}
```

The 1200 × 630 response embeds Nebula Sans Book and Bold from the immutable Design Kit dependency. It performs no remote asset fetch or runtime filesystem lookup. Pass six-digit hex theme colors to preserve the application's identity; keep a consumer-owned composition when the card deliberately uses serif or monospace typography.

## Choose the smallest interface

| Import | Use it for | Boundary |
| --- | --- | --- |
| `@hraness/web-discovery` | URLs, public/private metadata and robots, sitemaps, manifests, IndexNow, site/article schema, and feed images | Product-neutral data builders |
| `@hraness/web-discovery/json-ld` | One safely serialized React `<script type="application/ld+json">` | React rendering only |
| `@hraness/web-discovery/social-image` | One deterministic Next.js `ImageResponse` | Next.js social-image rendering only |

The root package does not crawl a site, inspect rendered HTML, submit an IndexNow request, generate editorial artwork, or decide whether a claim is true. Those effects and decisions remain with the consumer.

## Verify the packed contract

```sh
bun install --frozen-lockfile
bun run check
```

The complete check validates repository inventory and the public boundary, lints and typechecks the source, rebuilds the three committed runtime exports, runs deterministic and property tests, and packs the release. The package smoke then imports every runtime export and renders a PNG with genuine Node 24, typechecks installed consumers under Bundler and NodeNext resolution, and completes a real Next.js production build.

## Questions

### Can `robots.txt` make a page private?

No. Use application authentication and authorization. The private builders add the correct discovery signals, but crawlers are not an access-control boundary.

### Does the package verify that structured data is true?

It validates and projects the supplied record. The application must show the same facts in visible content and must not supply invented reviews, prices, dates, authorship, or other claims.

### Can paths include tracking queries or fragments?

No. Owned paths are canonical, root-relative paths. Queries, fragments, foreign origins, protocol-relative URLs, and spellings that URL parsing would normalize are rejected.

### Does every site need the shared social-card typography?

No. Use the shared renderer for proportional sans-serif cards. Keep a product-owned renderer when typography or composition is part of that product's identity.

## Change the projection carefully

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before changing a public builder. Add a deterministic example for each regression and a property test for every parsing, normalization, ordering, serialization, or round-trip law.

Report suspected vulnerabilities privately as described in [SECURITY.md](./SECURITY.md).

## License

MIT
