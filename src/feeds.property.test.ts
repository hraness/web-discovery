import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  createAtomFeed,
  createBlogSitemapPaths,
  createRssFeed,
  parseOwnedPath,
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
  parseXmlStrict,
} from "./strict-xml.testing";

const site = {
  description: "Feed laws.",
  name: "Example",
  origin: "https://example.com",
  title: "Example",
} as const satisfies SearchSite;

const XML_VALID = /^[\t\n\r -퟿-�\u{10000}-\u{10FFFF}]*$/u;

// Every XML-representable string, biased toward markup, entity, quote,
// whitespace, CDATA-terminator, and astral characters.
const hostile = fc.oneof(
  fc.constantFrom("&", "<", ">", "\"", "'", "]]>", "&amp;", "&#13;", "\r", "\n", "\t", "\r\n", " ", "😀", " ", "<![CDATA[", "-->"),
  fc.string({ unit: "grapheme", maxLength: 4 }),
  fc.string({ unit: "binary", maxLength: 4 }).filter((value) => XML_VALID.test(value)),
);
const xmlString = fc.array(hostile, { maxLength: 12 }).map((parts) => parts.join(""));
const nonempty = xmlString.filter((value) => value.trim().length > 0);

const pathCharacter = fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789-_".split(""));
const segment = fc.array(pathCharacter, { minLength: 1, maxLength: 12 })
  .map((characters) => characters.join(""));
const ownedPath = fc.array(segment, { minLength: 1, maxLength: 4 })
  .map((segments) => parseOwnedPath(`/${segments.join("/")}`));

const MIN_TIME = Date.UTC(2000, 0, 1);
const MAX_TIME = Date.UTC(2099, 11, 31);
const timestamp = fc.integer({ min: MIN_TIME, max: MAX_TIME })
  .map((milliseconds) => new Date(milliseconds).toISOString());

const author = fc.record({
  kind: fc.constantFrom("Organization" as const, "Person" as const),
  name: nonempty,
});

const entry = fc.record({
  authors: fc.array(author, { minLength: 1, maxLength: 2 }),
  categories: fc.uniqueArray(nonempty, { maxLength: 3 }),
  contentHtml: fc.option(nonempty, { nil: undefined }),
  modifiedOffset: fc.option(fc.integer({ min: 0, max: 86_400_000 }), { nil: undefined }),
  publishedTime: timestamp,
  summary: fc.option(nonempty, { nil: undefined }),
  title: nonempty,
});

const entries = fc.uniqueArray(
  fc.tuple(ownedPath, entry),
  { maxLength: 8, selector: ([path]) => path },
).map((pairs) => pairs.map(([path, value]): FeedEntry => ({
  authors: value.authors,
  categories: value.categories,
  path,
  publishedTime: value.publishedTime,
  title: value.title,
  ...(value.contentHtml === undefined ? {} : { contentHtml: value.contentHtml }),
  ...(value.summary === undefined ? {} : { summary: value.summary }),
  ...(value.modifiedOffset === undefined
    ? {}
    : {
      modifiedTime: new Date(Date.parse(value.publishedTime) + value.modifiedOffset).toISOString(),
    }),
})));

const feed = fc.record({
  description: nonempty,
  rights: fc.option(nonempty, { nil: undefined }),
  title: nonempty,
}).map((value): FeedDiscovery => ({
  authors: [{ kind: "Organization", name: "Example" }],
  description: value.description,
  homePath: "/blog",
  path: "/blog/feed.xml",
  title: value.title,
  updated: "2100-01-01T00:00:00.000Z",
  ...(value.rights === undefined ? {} : { rights: value.rights }),
}));

function newestFirst(list: readonly FeedEntry[]): FeedEntry[] {
  return [...list].sort((left, right) => (
    left.publishedTime === right.publishedTime
      ? (left.path < right.path ? -1 : 1)
      : (left.publishedTime < right.publishedTime ? 1 : -1)
  ));
}

describe("feed laws", () => {
  test("Atom output parses strictly and round-trips every text value", () => {
    fc.assert(fc.property(feed, entries, (feedValue, entryValues) => {
      const root = parseXmlStrict(createAtomFeed(site, feedValue, entryValues));
      expect(child(root, "title", ATOM_NS).text).toBe(feedValue.title);
      expect(child(root, "subtitle", ATOM_NS).text).toBe(feedValue.description);
      expect(children(root, "rights", ATOM_NS).map(({ text }) => text))
        .toEqual(feedValue.rights === undefined ? [] : [feedValue.rights]);
      const parsed = children(root, "entry", ATOM_NS);
      const expected = newestFirst(entryValues);
      expect(parsed.length).toBe(expected.length);
      parsed.forEach((element, index) => {
        const source = expected[index];
        if (source === undefined) throw new Error("entry count mismatch");
        const url = `https://example.com${source.path}`;
        expect(child(element, "id", ATOM_NS).text).toBe(url);
        expect(child(element, "link", ATOM_NS).attributes.get("href")).toBe(url);
        expect(child(element, "title", ATOM_NS).text).toBe(source.title);
        expect(child(element, "published", ATOM_NS).text).toBe(source.publishedTime);
        expect(child(element, "updated", ATOM_NS).text)
          .toBe(source.modifiedTime ?? source.publishedTime);
        expect(children(element, "author", ATOM_NS).map((a) => child(a, "name", ATOM_NS).text))
          .toEqual((source.authors ?? []).map(({ name }) => name));
        expect(children(element, "category", ATOM_NS).map((c) => c.attributes.get("term")))
          .toEqual([...(source.categories ?? [])]);
        expect(children(element, "summary", ATOM_NS).map(({ text }) => text))
          .toEqual(source.summary === undefined ? [] : [source.summary]);
        expect(children(element, "content", ATOM_NS).map(({ text }) => text))
          .toEqual(source.contentHtml === undefined ? [] : [source.contentHtml]);
      });
    }), { numRuns: 300 });
  });

  test("RSS output parses strictly and round-trips every text value", () => {
    fc.assert(fc.property(feed, entries, (feedValue, entryValues) => {
      const root = parseXmlStrict(createRssFeed(site, feedValue, entryValues));
      const channel = child(root, "channel", "");
      expect(child(channel, "title", "").text).toBe(feedValue.title);
      expect(child(channel, "description", "").text).toBe(feedValue.description);
      const parsed = children(channel, "item", "");
      const expected = newestFirst(entryValues);
      expect(parsed.length).toBe(expected.length);
      parsed.forEach((element, index) => {
        const source = expected[index];
        if (source === undefined) throw new Error("item count mismatch");
        const url = `https://example.com${source.path}`;
        expect(child(element, "link", "").text).toBe(url);
        expect(child(element, "guid", "").text).toBe(url);
        expect(child(element, "title", "").text).toBe(source.title);
        // RFC 822 dates carry whole seconds.
        expect(Date.parse(child(element, "pubDate", "").text))
          .toBe(Math.floor(Date.parse(source.publishedTime) / 1000) * 1000);
        expect(children(element, "creator", DC_NS).map(({ text }) => text))
          .toEqual((source.authors ?? []).map(({ name }) => name));
        expect(children(element, "category", "").map(({ text }) => text))
          .toEqual([...(source.categories ?? [])]);
        expect(children(element, "description", "").map(({ text }) => text))
          .toEqual(source.summary === undefined ? [] : [source.summary]);
        expect(children(element, "encoded", CONTENT_NS).map(({ text }) => text))
          .toEqual(source.contentHtml === undefined ? [] : [source.contentHtml]);
      });
    }), { numRuns: 300 });
  });

  test("feed output does not depend on input order", () => {
    fc.assert(fc.property(feed, entries, (feedValue, entryValues) => {
      const reversed = [...entryValues].reverse();
      expect(createAtomFeed(site, feedValue, reversed))
        .toBe(createAtomFeed(site, feedValue, entryValues));
      expect(createRssFeed(site, feedValue, reversed))
        .toBe(createRssFeed(site, feedValue, entryValues));
    }));
  });

  test("any value with a character outside XML 1.0 is rejected, never emitted", () => {
    const invalid = fc.oneof(
      fc.integer({ min: 0, max: 0x1f }).filter((code) => ![0x9, 0xa, 0xd].includes(code)),
      fc.integer({ min: 0xd800, max: 0xdfff }),
      fc.constantFrom(0xfffe, 0xffff),
    ).map((code) => String.fromCharCode(code));
    fc.assert(fc.property(nonempty, invalid, nonempty, (before, bad, after) => {
      const title = `${before}${bad}${after}`;
      const entryValue: FeedEntry = {
        path: "/blog/a",
        publishedTime: "2026-01-01T00:00:00.000Z",
        title,
      };
      const feedValue: FeedDiscovery = {
        authors: [{ kind: "Organization", name: "Example" }],
        description: "d",
        homePath: "/blog",
        path: "/blog/feed.xml",
        title: "t",
      };
      expect(() => createAtomFeed(site, feedValue, [entryValue])).toThrow(RangeError);
      expect(() => createRssFeed(site, feedValue, [entryValue])).toThrow(RangeError);
    }));
  });

  test("the blog sitemap index is dated by its newest article", () => {
    fc.assert(fc.property(
      fc.uniqueArray(fc.tuple(ownedPath, timestamp), { maxLength: 10, selector: ([path]) => path }),
      (pairs) => {
        const articles = pairs
          .filter(([path]) => path !== "/blog")
          .map(([path, time]): ArticleDiscovery => ({
            canonicalPath: path,
            description: "d",
            image: { alt: "a", contentType: "image/png", height: 1, path: "/i.png", width: 1 },
            publishedTime: time,
            title: "t",
            type: "BlogPosting",
          }));
        const [index, ...rest] = createBlogSitemapPaths({ path: "/blog" }, articles);
        const times = articles.flatMap(({ publishedTime }) => (
          publishedTime === undefined ? [] : [publishedTime]
        )).sort();
        expect(index?.lastModified).toBe(times.at(-1));
        expect(rest.map(({ path }) => path)).toEqual(articles.map(({ canonicalPath }) => canonicalPath));
      },
    ));
  });
});
