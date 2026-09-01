import { describe, expect, test } from "bun:test";

import {
  createPublicRobots,
  createPublicSiteMetadata,
  createSitemap,
  websiteJsonLd,
  type SearchSite,
} from "./index.js";

const readme = await Bun.file(new URL("../README.md", import.meta.url)).text();
const packageJson = await Bun.file(new URL("../package.json", import.meta.url)).json() as {
  version: string;
};

const site = {
  description: "A useful public browser tool.",
  name: "Example",
  origin: "https://example.com",
  title: "Example",
} as const satisfies SearchSite;

describe("README product contract", () => {
  test("keeps the immutable install synchronized with the package", () => {
    expect(readme).toContain(
      `"@hraness/web-discovery": "github:hraness/web-discovery#v${packageJson.version}"`,
    );
    expect(readme).toContain("The package owns the projection.");
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
      images: [{ url: "https://example.com/opengraph-image", width: 1200, height: 630 }],
    });
    expect(robots.sitemap).toBe("https://example.com/sitemap.xml");
    expect(sitemap.map(({ url }) => url)).toEqual([
      "https://example.com/",
      "https://example.com/guide",
    ]);
    expect(schema["@id"]).toBe("https://example.com/#website");
  });

  test("states the public, private, and effect boundaries", () => {
    expect(readme).toContain("Crawler policy is not access control.");
    expect(readme).toContain("does not crawl a site");
    expect(readme).toContain("Asset hashes, prompts, generation receipts");
    expect(readme).toContain("Bundler and NodeNext");
  });
});
