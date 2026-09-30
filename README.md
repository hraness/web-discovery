# @hraness/web-discovery

`@hraness/web-discovery` builds a Next.js site's metadata, `robots.txt`, sitemap, JSON-LD, Atom and RSS feeds, web manifest, IndexNow payload, and social card from site and article records you define once. It rejects malformed origins, paths, and social-card colors before producing any output.

The package turns your records into metadata. Your application still supplies every product fact, route, date, image, and visual decision.

## Install

Pin a release tag:

```json
{
  "dependencies": {
    "@hraness/web-discovery": "github:hraness/web-discovery#v0.13.0"
  }
}
```

```sh
bun install
```

The package supports Next.js 16.2 through 16.x, React 19, and Node.js 20.9 or newer.

Next.js is an optional peer. Only `./social-image` needs it at runtime; the other exports work in any React or Node application.

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

The card looks like a crop of the site's own page: its sticky header across the top, and the hero beneath it. The header band carries the brand mark and product name in the Design Kit metallic foil on the left and the domain on the right, over a hairline. The body has the site background, an eyebrow, a large Nebula Sans headline, and a muted description, in the site's own palette.

A home card sets the site tagline (`description`) as the headline. A page card sets `headline` and puts `description` beneath it. A card is a page card when you pass a `headline` that differs from `title`; pass `layout: "product"` or `layout: "page"` to choose. A home card that passes its hero headline as `headline` with `layout: "product"` shows the tagline beneath it, as the hero does.

The headline is `headline` when you pass it. Otherwise it is `title` with one trailing brand segment removed, such as ` | Example` or ` · example.com`, when that segment matches the eyebrow, the domain, or the domain without its last label (`example`), ignoring case. Other titles appear unchanged.

Pass the site's Design Kit palette, its header mark, and the product name as the header shows it:

```tsx
createSocialImageResponse({
  brand: "Gobstopper",
  brandMark: "<svg viewBox=\"0 0 24 24\">...</svg>",
  description: "Compacts long agent sessions.",
  domain: "gobstopper.sh",
  palette: "tokyo-night",
  title: "Gobstopper",
});
```

`palette` is one of `catppuccin`, `gruvbox`, `rose-pine`, `tokyo-night`, or `paper` (`socialImagePaletteNames`). The card uses that palette's light-theme background, header surface, hairline, text, and muted colors from Design Kit's `palette-system.css`. A site on its own colors passes `theme` instead, or alongside a palette to override single colors: `{ background, foreground, muted, headerBackground, line }`, each a six-digit hex color. Without `headerBackground`, the header band is the background deepened slightly toward the foreground.

`brandMark` is the same monochrome glyph the site header paints in foil: SVG markup, or a `data:` URL of an SVG or a base64 PNG. The card uses only its alpha, trims its empty margin, and paints it in foil at header size. It throws before rendering for any other value, including remote URLs and file paths. Without a mark, the header shows the product name alone. `brand` defaults to `title`.

The foil follows Design Kit's brand foil: neutral metal bands mixed from the text and header colors, a six-stop reflection at 14% at 115 degrees, and a resting highlight at the center. The card bakes it into SVG gradients and a mask, so it renders the same in Next.js `ImageResponse`, in `satori`, and in `@resvg/resvg-js`.

`icon`, `mark`, `theme.accent`, and `theme.wash` are from v0.12 and still build. A `mark` icon is drawn as a `brandMark`. An `app` icon is drawn as it is, at the same size, in the header. The accent and wash are ignored, because no marketing site draws them. `socialImageIconShape(icon)` still reports whether an icon is `"square"`, `"solid"`, or `"open"`.

Text is at least 30 pixels tall. The card keeps your capitalization. Lines break at whole words and are balanced to even length. No line ends on a word such as "the" or "and", a headline avoids leaving one word alone on the first or last line, and a two-word name such as "Puerto Rico" stays together unless that would strand the last word, in which case the break moves earlier ("Ley 60 / en Puerto Rico guide"). A headline that would start with one short word moves the next word up instead: "Wordcell vs / Supermemory", not "Wordcell / vs Supermemory". A description is cut before an em or en dash rather than after it, and a product description keeps its standard size and two-line limit, ending at a clause.

To keep a longer name on one line, list it in `keepTogether` on the site or the card details (`keepTogether: ["Claude Code Router"]`, matched without case), or join its words with a no-break space (U+00A0) in the copy. The card then breaks around it: "xcb vs / Claude Code Router".

The card sets typography in the domain-free text fields. Straight quotes in the headline, description, eyebrow, and name become curly quotes, and apostrophes in contractions and possessives become ’ ("Lovelace’s", "ALGAL’s"). A hyphen between two ascending numbers of similar length becomes an en dash ("2024–2025", "10–20"). URLs, domains, paths, code-like tokens such as `file.ts` or `a_b`, and text in backticks stay as written. `socialImageTypography(text)` applies the same rules to any string.

- **Headline.** A home card sets its tagline as large as fits two lines, from 80 to 64 pixels, or three lines from 60 to 48 pixels. A page headline is set at 80 pixels on one or two lines. Only a headline that cannot fit two lines at 80 pixels is set smaller, at the largest of 62 to 46 pixels where it fits in up to three lines.
- **Description.** A description that does not fit ends at its last whole sentence or clause that does, never on a word such as "and". The card ends it with an ellipsis only when no clause fits.
- **Eyebrow.** The card drops the eyebrow when the headline already opens with it, ignoring case: "Introducing" over "Introducing Example", or "Docs" over "Documentation".
- **Placeholders.** Bracketed placeholders are removed: `[DRAFT]`, `[WIP]`, `[TODO]`, `[TBD]`, `[TK]`, `[FIXME]`, `[placeholder]`, `[preview]`, `[coming soon]`, `[lorem ipsum]`, `[title]`, `[no title]`, `[description]`, and `[headline]`, ignoring case. A field that holds only a placeholder counts as empty. Other bracketed text, such as a work titled `[untitled]`, stays. Write `\[DRAFT]` to draw a listed word in brackets as written.
- **Unsupported characters.** Emoji, CJK, and any other character the embedded fonts cannot draw are removed, so the card never shows an empty box and never fetches a fallback font.

To check that copy fits as written, call `socialImageFit(details)`. It lays out the card without rendering it and returns the lines drawn, whether the description was shortened (`description.cut`) or set below its standard size (`description.reduced`), whether the headline was set smaller or needs three lines (`headline.reduced`, `headline.threeLine`), what was removed, and a list of `issues`. `findings` holds the same issues with a stable `code` each. Assert `issues` is empty in a test, or pass `strict: true` to make the card throw instead:

```ts
import { socialImageFit, socialImageSiteDetails } from "@hraness/web-discovery/social-image/card";

expect(socialImageFit(socialImageSiteDetails(socialSite, page)).issues).toEqual([]);
```

| Code | Reported when |
| --- | --- |
| `headline-reduced`, `headline-three-lines`, `headline-clamped` | The headline is set smaller, needs three lines, or ends in an ellipsis. |
| `home-headline-three-lines` | A home card's tagline needs three lines. Pass the site's short hero headline as `headline` with `layout: "product"`. |
| `description-shortened`, `description-clamped` | The description ends at an earlier clause, or in an ellipsis. |
| `description-reduced` | The description fits only below its standard size. Shorten it. |
| `description-repeats-tagline` | A page card's description is the site tagline. `socialImageSiteDetails` passes the tagline as `tagline`. |
| `description-trailing-ellipsis` | The description you passed already ends in `...` or `…`. |
| `eyebrow-missing` | A page card has no eyebrow. Pass `eyebrow: ""` in the details, or `eyebrow: false` on a site page, to leave it out on purpose. |
| `eyebrow-repeats-headline` | The eyebrow repeats the headline's opening, so the card drops it. |
| `placeholder`, `unsupported-characters` | Text was removed. |

`strict: true` throws on the codes that mean the copy changed to fit. It ignores the review codes added in v0.12.0 (`description-reduced`, `description-repeats-tagline`, `description-trailing-ellipsis`, `eyebrow-missing`, and `eyebrow-repeats-headline`), so a strict build keeps passing after the upgrade.

The eyebrow, description, and domain use the palette's muted color, and the headline its foreground. Each is darkened or lightened until it meets 7:1 (headline) or 4.5:1 (muted text) against both the header band and the body.

### Keep sites apart in a feed

Sites that share a hue family look like one site in a feed of thumbnails. `socialImagePaletteDistance(a, b)` measures how far apart two resolved palettes look (`socialImagePalette(theme)` or `socialImageSitePalette(site)`). `socialImageLookAlikes(sites)` returns every pair closer than `SOCIAL_IMAGE_MIN_PALETTE_DISTANCE`. Run it in a test over every site you own:

```ts
import { socialImageLookAlikes } from "@hraness/web-discovery/social-image/card";

expect(socialImageLookAlikes([socialSite, ...otherSites])).toEqual([]);
```

Sites that share a Design Kit palette share it on the web too, so `socialImageLookAlikes` does not flag them: their cards differ by mark and name, as their headers do. It compares sites on different palettes, or with their own `theme` colors.

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
  brandMark: exampleMarkSvg, // the glyph the site header paints in foil
  name: "Example",
  palette: "paper",
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

A page card without a `description` shows no description. It does not repeat the site tagline, which appears only on the home card.

A page card without an `eyebrow` takes one from its route when you pass `path`. `socialImageEyebrow(path)` names the first segment: `/docs/...` gives "Documentation", `/blog/...` "Blog", `/compare/...` and `/vs/...` "Comparison", `/guides/...` "Guide", `/integrations/...` "Integration", `/releases/...` and `/changelog` "Release", and any other segment its words in sentence case (`/use-cases` gives "Use cases"). The home page gets none, and a label that only repeats the headline is left out. Pass `eyebrow: false` to leave a card without one:

```ts
createSiteSocialImageResponse(socialSite, {
  description: doc.summary,
  headline: doc.title,
  path: "/docs/setup",
});
```

v0.11.0 changes how existing cards look, with no API change: descriptions end at a clause instead of an ellipsis, page cards without a description no longer show the tagline, duplicate eyebrows, placeholders, and unsupported characters are removed, headlines keep one size for one or two lines, the background wash follows each site's brand color, and icons sit in the safe area above. The new exports are `socialImageFit`, `socialImageIconShape`, and `SOCIAL_IMAGE_GLYPH_SHARE`, plus the optional `strict` and `theme.wash` fields.

v0.11.1 fixes typechecking for consumers whose `tsconfig.json` sets `erasableSyntaxOnly`. The published source no longer uses TypeScript syntax that the option rejects, and cards render the same.

v0.12.0 adds curly quotes and en dashes, keeps a short word off a headline's first line, adds `keepTogether` names, route-derived eyebrows (`path`, `eyebrow: false`, and `socialImageEyebrow`), review findings with codes in `socialImageFit`, palette distance checks, and lets real bracketed titles such as `[untitled]` through. Existing options behave as before, and `strict` throws on no new cases.

v0.13.0 redraws the card to match the marketing sites: the sticky header with the foil mark and name over the hero, in the site's Design Kit palette, with no tile or wash. Home cards set the tagline as the headline. It adds `brand`, `brandMark`, `palette`, `theme.headerBackground`, `theme.line`, `socialImagePaletteNames`, and the `home-headline-three-lines` finding. v0.12 options still build: `icon` and `mark` draw in the header, and `theme.accent` and `theme.wash` are ignored.

`defineSocialImageSite` checks the name, domain, description, brand mark, and icon when the module loads, so a bad icon fails the build instead of a share preview. Static sites build the same details with `socialImageSiteDetails` from `@hraness/web-discovery/social-image/card` and pass them to `createSocialImageCard`.

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
