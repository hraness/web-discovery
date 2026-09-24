import { describe, expect, test } from "bun:test";

import {
  articleJsonLd,
  blogJsonLd,
  createAtomFeed,
  createBlogSitemapPaths,
  createFeedEntry,
  createPublicSiteMetadata,
  createRssFeed,
  createSitemap,
  type ArticleDiscovery,
  type FeedDiscovery,
  type FeedEntry,
  type SearchSite,
} from "./discovery";
import {
  ATOM_NS,
  child,
  children,
  CONTENT_NS,
  DC_NS,
  optionalText,
  parseXmlStrict,
} from "./strict-xml.testing";

const site = {
  description: "Notes on building careful software.",
  language: "en-US",
  name: "Example",
  origin: "https://example.com",
  title: "Example",
} as const satisfies SearchSite;

const organization = { kind: "Organization", name: "Example", path: "/" } as const;

const image = {
  alt: "A diagram of two services exchanging signed receipts.",
  contentType: "image/png",
  height: 630,
  path: "/blog/receipts.png",
  width: 1200,
} as const;

const first = {
  authors: [organization],
  blogPath: "/blog",
  canonicalPath: "/blog/receipts",
  description: "Why every write returns a receipt you can replay.",
  image,
  keywords: ["receipts", "replay"],
  modifiedTime: "2026-09-20T08:00:00.000Z",
  publishedTime: "2026-09-10T00:00:00.000Z",
  publisher: organization,
  title: "Receipts & replay: <writes> you can check",
  type: "BlogPosting",
} as const satisfies ArticleDiscovery;

const second = {
  authors: [{ kind: "Person", name: "Ada \"Quotes\" O'Neil" }],
  blogPath: "/blog",
  canonicalPath: "/blog/introducing-example",
  description: "What Example is for.",
  image: { ...image, path: "/blog/introducing.png" },
  publishedTime: "2026-09-15T00:00:00.000Z",
  title: "Introducing Example",
  type: "BlogPosting",
} as const satisfies ArticleDiscovery;

const feed = {
  authors: [organization],
  description: "Notes from Example.",
  homePath: "/blog",
  path: "/blog/feed.xml",
  rights: "© 2026 Example",
  title: "Example blog",
} as const satisfies FeedDiscovery;

const entries = [
  createFeedEntry(first, {
    contentHtml: "<p>Tom &amp; Jerry said \"hi\" ]]> </p>",
    imageLength: 48_213,
  }),
  createFeedEntry(second),
] as const satisfies readonly FeedEntry[];

describe("BlogPosting and Blog JSON-LD", () => {
  test("links a post to its blog with an Organization author and publisher", () => {
    const schema = articleJsonLd(site, first);

    expect(schema).toMatchObject({
      "@type": "BlogPosting",
      "@id": "https://example.com/blog/receipts#article",
      author: [{ "@type": "Organization", name: "Example", url: "https://example.com/" }],
      datePublished: "2026-09-10T00:00:00.000Z",
      dateModified: "2026-09-20T08:00:00.000Z",
      image: { "@type": "ImageObject", url: "https://example.com/blog/receipts.png" },
      isPartOf: {
        "@type": "Blog",
        "@id": "https://example.com/blog#blog",
        url: "https://example.com/blog",
      },
      publisher: { "@type": "Organization", name: "Example", url: "https://example.com/" },
    });
  });

  test("rejects an article that names two parents or an inverted date pair", () => {
    const twoParents = { ...first, isPartOfPath: "/" } as unknown as ArticleDiscovery;
    expect(() => articleJsonLd(site, twoParents)).toThrow("not both");
    expect(() => articleJsonLd(site, {
      ...first,
      modifiedTime: "2026-09-01T00:00:00.000Z",
    })).toThrow("cannot precede");
  });

  test("lists posts whose ids match each post's own schema", () => {
    const schema = blogJsonLd(site, {
      description: "Notes from Example.",
      name: "Example blog",
      path: "/blog",
      publisher: organization,
    }, [second, first]);

    expect(articleJsonLd(site, first).isPartOf?.["@id"]).toBe(schema["@id"]);
    expect(schema.isPartOf).toEqual({ "@id": "https://example.com/#website" });
    expect(schema.blogPost.map((post) => post["@id"])).toEqual([
      articleJsonLd(site, second)["@id"],
      articleJsonLd(site, first)["@id"],
    ]);
    expect(schema.blogPost[1]).toEqual({
      "@type": "BlogPosting",
      "@id": "https://example.com/blog/receipts#article",
      url: "https://example.com/blog/receipts",
      headline: first.title,
      description: first.description,
      datePublished: first.publishedTime,
      dateModified: first.modifiedTime,
    });
    expect(() => blogJsonLd(site, {
      description: "d",
      name: "n",
      path: "/blog",
    }, [first, first])).toThrow("twice");
  });
});

describe("blog sitemap paths", () => {
  test("dates the index by its newest article and keeps each article lastmod", () => {
    const paths = createBlogSitemapPaths({ path: "/blog" }, [first, second]);

    expect(paths).toEqual([
      { lastModified: "2026-09-20T08:00:00.000Z", path: "/blog" },
      { images: ["/blog/receipts.png"], lastModified: "2026-09-20T08:00:00.000Z", path: "/blog/receipts" },
      { images: ["/blog/introducing.png"], lastModified: "2026-09-15T00:00:00.000Z", path: "/blog/introducing-example" },
    ]);
    expect(createSitemap(site.origin, paths).map(({ url }) => url)).toEqual([
      "https://example.com/blog",
      "https://example.com/blog/receipts",
      "https://example.com/blog/introducing-example",
    ]);
    expect(createBlogSitemapPaths({ path: "/blog" }, [])).toEqual([{ path: "/blog" }]);
    expect(createBlogSitemapPaths(
      { lastModified: "2026-09-22T00:00:00.000Z", path: "/blog" },
      [first],
    )[0]).toEqual({ lastModified: "2026-09-22T00:00:00.000Z", path: "/blog" });
  });
});

describe("feed discovery links", () => {
  test("advertises RSS and Atom alternates from one origin", () => {
    const metadata = createPublicSiteMetadata(site, {
      atomFeedPath: "/blog/atom.xml",
      canonicalPath: "/blog",
      feedPath: "/blog/feed.xml",
    });
    expect(metadata.alternates).toEqual({
      canonical: "https://example.com/blog",
      types: {
        "application/atom+xml": "https://example.com/blog/atom.xml",
        "application/rss+xml": "https://example.com/blog/feed.xml",
      },
    });
  });
});

describe("Atom feed", () => {
  const xml = createAtomFeed(site, feed, entries);
  const root = parseXmlStrict(xml);

  test("is well-formed Atom with absolute identity and derived update time", () => {
    expect(xml.startsWith("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n")).toBe(true);
    expect(root.localName).toBe("feed");
    expect(root.namespace).toBe(ATOM_NS);
    expect(root.attributes.get("{http://www.w3.org/XML/1998/namespace}lang")).toBe("en-US");
    expect(child(root, "id", ATOM_NS).text).toBe("https://example.com/blog/feed.xml");
    expect(child(root, "updated", ATOM_NS).text).toBe("2026-09-20T08:00:00.000Z");
    expect(child(root, "rights", ATOM_NS).text).toBe("© 2026 Example");
    const links = children(root, "link", ATOM_NS).map((link) => [
      link.attributes.get("rel"),
      link.attributes.get("href"),
    ]);
    expect(links).toEqual([
      ["self", "https://example.com/blog/feed.xml"],
      ["alternate", "https://example.com/blog"],
    ]);
    const author = child(root, "author", ATOM_NS);
    expect(child(author, "name", ATOM_NS).text).toBe("Example");
    expect(child(author, "uri", ATOM_NS).text).toBe("https://example.com/");
  });

  test("orders entries newest first and round-trips escaped text", () => {
    const [newest, older] = children(root, "entry", ATOM_NS);
    if (newest === undefined || older === undefined) throw new Error("missing entries");
    expect(child(newest, "id", ATOM_NS).text).toBe("https://example.com/blog/introducing-example");
    expect(child(child(newest, "author", ATOM_NS), "name", ATOM_NS).text)
      .toBe("Ada \"Quotes\" O'Neil");
    expect(child(older, "title", ATOM_NS).text).toBe(first.title);
    expect(child(older, "published", ATOM_NS).text).toBe(first.publishedTime);
    expect(child(older, "updated", ATOM_NS).text).toBe(first.modifiedTime);
    expect(child(older, "summary", ATOM_NS).text).toBe(first.description);
    const content = child(older, "content", ATOM_NS);
    expect(content.attributes.get("type")).toBe("html");
    expect(content.text).toBe("<p>Tom &amp; Jerry said \"hi\" ]]> </p>");
    expect(children(older, "category", ATOM_NS).map((c) => c.attributes.get("term")))
      .toEqual(["receipts", "replay"]);
    const enclosure = children(older, "link", ATOM_NS)
      .find((link) => link.attributes.get("rel") === "enclosure");
    expect(enclosure?.attributes).toEqual(new Map([
      ["rel", "enclosure"],
      ["type", "image/png"],
      ["length", "48213"],
      ["href", "https://example.com/blog/receipts.png"],
    ]));
  });

  test("requires an author at the feed or entry level", () => {
    const anonymous: FeedDiscovery = {
      description: feed.description,
      homePath: feed.homePath,
      path: feed.path,
      title: feed.title,
    };
    expect(() => createAtomFeed(site, anonymous, [createFeedEntry({
      ...second,
      authors: [],
    })])).toThrow("needs an author");
    expect(() => createAtomFeed(site, anonymous, [entries[0]])).not.toThrow();
  });
});

describe("RSS feed", () => {
  const xml = createRssFeed(site, feed, entries);
  const root = parseXmlStrict(xml);
  const channel = child(root, "channel", "");

  test("is well-formed RSS 2.0 with a self link and RFC 822 dates", () => {
    expect(root.localName).toBe("rss");
    expect(root.attributes.get("version")).toBe("2.0");
    expect(child(channel, "link", "").text).toBe("https://example.com/blog");
    expect(child(channel, "lastBuildDate", "").text).toBe("Sun, 20 Sep 2026 08:00:00 GMT");
    expect(child(channel, "copyright", "").text).toBe("© 2026 Example");
    expect(child(channel, "link", ATOM_NS).attributes.get("href"))
      .toBe("https://example.com/blog/feed.xml");
  });

  test("writes items newest first with creators, categories, content, and enclosure", () => {
    const [newest, older] = children(channel, "item", "");
    if (newest === undefined || older === undefined) throw new Error("missing items");
    expect(child(newest, "guid", "").text).toBe("https://example.com/blog/introducing-example");
    expect(child(newest, "pubDate", "").text).toBe("Tue, 15 Sep 2026 00:00:00 GMT");
    expect(children(newest, "creator", DC_NS).map(({ text }) => text))
      .toEqual(["Ada \"Quotes\" O'Neil"]);
    expect(child(older, "title", "").text).toBe(first.title);
    expect(children(older, "category", "").map(({ text }) => text)).toEqual(["receipts", "replay"]);
    expect(optionalText(older, "encoded", CONTENT_NS))
      .toBe("<p>Tom &amp; Jerry said \"hi\" ]]> </p>");
    expect(child(older, "enclosure", "").attributes).toEqual(new Map([
      ["url", "https://example.com/blog/receipts.png"],
      ["length", "48213"],
      ["type", "image/png"],
    ]));
  });

  test("falls back to feed authors for items without their own", () => {
    const withoutAuthors = createRssFeed(site, feed, [{
      path: "/blog/a",
      publishedTime: "2026-09-01T00:00:00.000Z",
      title: "A",
    }]);
    const item = child(child(parseXmlStrict(withoutAuthors), "channel", ""), "item", "");
    expect(children(item, "creator", DC_NS).map(({ text }) => text)).toEqual(["Example"]);
  });
});

describe("feed validation", () => {
  const builders = [
    ["Atom", createAtomFeed],
    ["RSS", createRssFeed],
  ] as const;

  for (const [format, builder] of builders) {
    test(`rejects values XML 1.0 cannot carry (${format})`, () => {
      expect(() => builder(site, { ...feed, title: "Bell\u0007" }, [entries[1]])).toThrow("U+0007");
      expect(() => builder(site, feed, [{ ...entries[1], summary: "\uD800" }])).toThrow("U+D800");
      expect(() => builder(site, feed, [{ ...entries[1], title: "￾" }])).toThrow("U+FFFE");
    });
  }

  for (const [format, builder] of builders) {
    test(`rejects duplicate entries and categories (${format})`, () => {
      expect(() => builder(site, feed, [entries[1], entries[1]])).toThrow("twice");
      expect(() => builder(site, feed, [{ ...entries[1], categories: ["a", "a"] }])).toThrow("twice");
    });
  }

  for (const [format, builder] of builders) {
    test(`rejects non-canonical dates and stale feed updates (${format})`, () => {
      expect(() => builder(site, feed, [{ ...entries[1], publishedTime: "2026-09-15" }]))
        .toThrow("ISO 8601");
      expect(() => builder(site, feed, [{
        ...entries[1],
        modifiedTime: "2026-09-01T00:00:00.000Z",
      }])).toThrow("before its publishedTime");
      expect(() => builder(site, { ...feed, updated: "2026-09-01T00:00:00.000Z" }, [entries[1]]))
        .toThrow("newest entry");
      expect(() => builder(site, feed, [])).toThrow("explicit updated");
      expect(() => builder(site, { ...feed, updated: "2026-09-01T00:00:00.000Z" }, []))
        .not.toThrow();
    });
  }

  for (const [format, builder] of builders) {
    test(`rejects foreign or non-canonical paths (${format})`, () => {
      expect(() => builder(site, { ...feed, path: "//evil.example/feed" }, [])).toThrow();
      expect(() => builder(site, feed, [{ ...entries[1], path: "/a?b" }])).toThrow();
      expect(() => builder(site, feed, [{
        ...entries[1],
        enclosure: { image, length: -1 },
      }])).toThrow("nonnegative");
    });
  }

  test("requires a published time to project an article", () => {
    const unpublished: ArticleDiscovery = {
      canonicalPath: "/blog/draft",
      description: "Not yet published.",
      image,
      title: "Draft",
      type: "BlogPosting",
    };
    expect(() => createFeedEntry(unpublished)).toThrow("publishedTime");
  });
});
