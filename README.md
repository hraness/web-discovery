# @hraness/web-discovery

Validated Next.js metadata, crawler, sitemap, JSON-LD, and social-image primitives.

The package keeps a public site's discovery surfaces coherent from one checked HTTPS origin. Product titles, descriptions, routes, update dates, crawler decisions, and visual identity stay in the application.

## Install

Pin the immutable GitHub release:

```json
{
  "dependencies": {
    "@hraness/web-discovery": "github:hraness/web-discovery#v0.3.0"
  }
}
```

Then install with Bun:

```sh
bun install
```

The package supports Next.js 16.2 through 16.x and React 19. It runs under Node.js 20.9 or newer.

## Metadata

```ts
import {
  createPublicRobots,
  createPublicSiteMetadata,
  createSitemap,
  type SearchSite,
} from "@hraness/web-discovery";

const site = {
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
```

Origins must be bare HTTPS origins. Owned paths must be root-relative and cannot contain a query, fragment, foreign origin, or spelling that URL parsing would normalize.

Use `createPrivateSiteMetadata` and `createPrivateRobots` for private surfaces. The private metadata builder applies page-level `noindex` and omits canonical and social metadata. Crawler policy is not authentication or authorization.

## Representative article images

Keep the article's visible image, social crop, metadata, schema, feed, and
sitemap entry bound to one consumer-owned record:

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

export const metadata = createArticleMetadata(site, article);
export const articleSchema = articleJsonLd(site, article);
export const sitemapEntry = createArticleSitemapPath(article);
export const atomImage = createAtomImageEnclosure(site.origin, article.image);
```

Render the image and its caption in the page's initial HTML. Keep any asset
hash, generation receipt, prompt digest, or source provenance in the same
application registry; those review fields are intentionally not part of this
product-neutral package. `createArticleMetadata` uses the social crop when one
exists, while schema, Atom, and the image sitemap use the visible article
image. RSS callers can use `createRssImageEnclosure` with the checked byte
length.

## JSON-LD

```tsx
import { websiteJsonLd } from "@hraness/web-discovery";
import { JsonLdScript } from "@hraness/web-discovery/json-ld";

export function WebsiteSchema() {
  return <JsonLdScript data={websiteJsonLd(site)} id="website-schema" />;
}
```

`JsonLdScript` escapes data for an HTML script context. Emit only structured data that describes visible content.

## Social images

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

The response embeds the official Nebula Sans Book and Bold OTF payloads from the immutable `@hraness/design-kit` release. It stays deterministic and uses no remote assets or runtime filesystem lookups. Applications can pass explicit theme colors while retaining ownership of their visual identity. Consumer-owned cards that deliberately use serif or monospace typography remain separate, explicit compositions.

## Development

Use Bun 1.3.14 and Node 24:

```sh
bun install --frozen-lockfile
bun run check
```

The complete check validates the repository inventory and public boundary, lints and typechecks the source, rebuilds the committed distribution, runs examples and property tests, packs the release artifact, imports every runtime export and renders a PNG with genuine Node, typechecks an installed consumer under Bundler and NodeNext resolution, and compiles the package in a real Next.js production build.

## License

MIT
