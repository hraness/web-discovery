import { describe, expect, test } from "bun:test";

import {
  articleJsonLd,
  blogJsonLd,
  createAtomFeed,
  createBlogSitemapPaths,
  createFeedEntry,
  createPublicRobots,
  createPublicSiteMetadata,
  createRssFeed,
  createSitemap,
  websiteJsonLd,
  type ArticleDiscovery,
  type FeedDiscovery,
  type SearchSite,
} from "./index.js";

const readme = await Bun.file(new URL("../README.md", import.meta.url)).text();
const packageJson = await Bun.file(new URL("../package.json", import.meta.url)).json() as {
  version: string;
};

const site = {
  description: "Convert CSV files to charts in your browser.",
  name: "Example",
  origin: "https://example.com",
  title: "Example",
} as const satisfies SearchSite;

describe("README product contract", () => {
  test("keeps the immutable install synchronized with the package", () => {
    expect(readme).toContain(
      `"@hraness/web-discovery": "github:hraness/web-discovery#v${packageJson.version}"`,
    );
    expect(readme).toContain(
      "Your application still supplies every product fact, route, date, image, and visual decision.",
    );
  });

  test("names only the current release tag in the install section", () => {
    const install = readme.slice(readme.indexOf("## Install"), readme.indexOf("\n## ", readme.indexOf("## Install") + 1));
    const tags = [...install.matchAll(/v\d+\.\d+\.\d+/gu)].map(([tag]) => tag);

    expect(tags.length).toBeGreaterThan(0);
    expect(new Set(tags)).toEqual(new Set([`v${packageJson.version}`]));
  });

  test("documents the default social alt text and card headline", () => {
    expect(readme).toContain("its alt text is the page's social title");
    expect(readme).toContain("The headline is `headline` when you pass it.");
  });

  test("executes the complete first-proof example", () => {
    const metadata = createPublicSiteMetadata(site);
    const robots = createPublicRobots(site.origin);
    const sitemap = createSitemap(site.origin, [
      { path: "/", priority: 1 },
      { path: "/guide" },
    ]);
    const schema = websiteJsonLd(site);

    expect(metadata.alternates).toEqual({ canonical: "https://example.com/" });
    expect(metadata.openGraph).toMatchObject({
      url: "https://example.com/",
      images: [{ alt: "Example", url: "https://example.com/opengraph-image", width: 1200, height: 630 }],
    });
    expect(robots.sitemap).toBe("https://example.com/sitemap.xml");
    expect(sitemap.map(({ url }) => url)).toEqual([
      "https://example.com/",
      "https://example.com/guide",
    ]);
    expect(schema["@id"]).toBe("https://example.com/#website");
    expect(readme).toContain("image alt       Example");
  });

  test("executes the blog, feed, and sitemap example", () => {
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

    const blogSchema = blogJsonLd(site, {
      description: "Posts from Example.",
      name: "Example blog",
      path: "/blog",
    }, [post]);
    const atom = createAtomFeed(site, feed, [
      createFeedEntry(post, { contentHtml: "<p>The post body.</p>" }),
    ]);
    const rss = createRssFeed(site, feed, [createFeedEntry(post)]);

    expect(articleJsonLd(site, post).isPartOf?.["@id"]).toBe("https://example.com/blog#blog");
    expect(blogSchema["@id"]).toBe("https://example.com/blog#blog");
    expect(readme).toContain("`https://example.com/blog#blog`");
    expect(createBlogSitemapPaths({ path: "/blog" }, [post])[0]).toEqual({
      lastModified: "2026-09-23T00:00:00.000Z",
      path: "/blog",
    });
    expect(atom).toContain("<content type=\"html\">&lt;p&gt;The post body.&lt;/p&gt;</content>");
    expect(rss).toContain("<guid isPermaLink=\"true\">https://example.com/blog/first-post</guid>");
    expect(readme).toContain("rounds dates to whole seconds");
  });

  test("states the public, private, and effect boundaries", () => {
    expect(readme).toContain("Crawler policy is not access control.");
    expect(readme).toContain("does not crawl a site");
    expect(readme).toContain("The package does not read or emit them.");
    expect(readme).toContain("Bundler and NodeNext");
  });
});
