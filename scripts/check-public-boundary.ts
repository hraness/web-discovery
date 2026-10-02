import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { workflowWriteViolation } from "./workflow-write-boundary.js";

const repositoryRoot = resolve(import.meta.dir, "..");
const ignoredDirectories = new Set([".git", "dist", "node_modules"]);
const textExtensions = new Set([
  "", ".json", ".md", ".mjs", ".ts", ".tsx", ".yml", ".yaml",
]);
const privateIdentityDigest =
  "91ed2ef15eee7102873d33d852cae9a195eff25e758269de6457723b1d8dc29a";
const absoluteUserPrefix = ["/", "Users", "/"].join("");

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const candidate = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await files(candidate));
    else if (
      entry.isFile()
      && textExtensions.has(extname(entry.name))
    ) {
      paths.push(candidate);
    }
  }
  return paths;
}

for (const path of await files(repositoryRoot)) {
  const contents = await readFile(path, "utf8");
  const normalized = contents.toLocaleLowerCase("en-US");
  for (let index = 0; index <= normalized.length - 6; index += 1) {
    const digest = createHash("sha256")
      .update(normalized.slice(index, index + 6))
      .digest("hex");
    if (digest === privateIdentityDigest) {
      throw new Error(
        `${relative(repositoryRoot, path)} contains a private product identity`,
      );
    }
  }
  if (contents.includes(absoluteUserPrefix)) {
    throw new Error(
      `${relative(repositoryRoot, path)} contains an absolute user path`,
    );
  }
  if (path.includes(`${join(".github", "workflows")}${String.raw`/`}`)) {
    const violation = workflowWriteViolation(relative(repositoryRoot, path), contents);
    if (violation !== undefined) throw new Error(violation);
  }
}

const releaseWorkflow = await readFile(
  join(repositoryRoot, ".github/workflows/release.yml"),
  "utf8",
);
for (const required of [
  "needs: verify",
  "verified_tag:",
  "contents: write",
  "gh release create",
  "isImmutable",
]) {
  if (!releaseWorkflow.includes(required)) {
    throw new Error(`release workflow is missing ${required}`);
  }
}
if ([...releaseWorkflow.matchAll(/contents: write/gu)].length !== 1) {
  throw new Error("release workflow must scope contents write to one publisher");
}

const manifest = JSON.parse(
  await readFile(join(repositoryRoot, "package.json"), "utf8"),
) as {
  dependencies?: unknown;
  exports?: unknown;
  peerDependencies?: unknown;
  peerDependenciesMeta?: unknown;
};
const expectedExports = {
  ".": {
    types: "./dist/index.d.ts",
    import: "./dist/index.js",
    default: "./dist/index.js",
  },
  "./json-ld": {
    types: "./dist/json-ld.d.ts",
    import: "./dist/json-ld.js",
    default: "./dist/json-ld.js",
  },
  "./social-image": {
    types: "./dist/social-image.d.ts",
    import: "./dist/social-image.js",
    default: "./dist/social-image.js",
  },
  "./social-image/card": {
    types: "./dist/social-image-card.d.ts",
    import: "./dist/social-image-card.js",
    default: "./dist/social-image-card.js",
  },
};
if (JSON.stringify(manifest.exports) !== JSON.stringify(expectedExports)) {
  throw new Error("package exports must expose the four reviewed entrypoints");
}
if (JSON.stringify(manifest.peerDependencies) !== JSON.stringify({
  next: ">=16.2.0 <17.0.0",
  react: ">=19.0.0 <20.0.0",
})) {
  throw new Error("package must declare only the supported Next.js and React peers");
}
// Next.js is optional: the root and card exports work without it, and
// consumers that only use them should not install it.
if (JSON.stringify(manifest.peerDependenciesMeta) !== JSON.stringify({
  next: { optional: true },
})) {
  throw new Error("package must mark only the Next.js peer optional");
}
if (JSON.stringify(manifest.dependencies) !== JSON.stringify({
  "@hraness/design-kit": "github:hraness/design-kit#v0.5.0",
})) {
  throw new Error("package must pin only the reviewed Design Kit release");
}

for (const [source, requiredImport] of [
  ["src/index.ts", 'from "./discovery.js"'],
  ["src/json-ld.tsx", 'from "./discovery.js"'],
  ["src/social-image.tsx", 'from "./discovery.js"'],
] as const) {
  const contents = await readFile(join(repositoryRoot, source), "utf8");
  if (!contents.includes(requiredImport)) {
    throw new Error(`${source} must preserve NodeNext-safe internal imports`);
  }
}

const socialImageSource = await readFile(
  join(repositoryRoot, "src/social-image.tsx"),
  "utf8",
);
if (!socialImageSource.includes('from "next/og.js"')) {
  throw new Error("social-image runtime must use the Node-compatible Next.js export");
}
const socialImageCardSource = await readFile(
  join(repositoryRoot, "src/social-image-card.tsx"),
  "utf8",
);
if (!socialImageCardSource.includes(
  'from "@hraness/design-kit/fonts/nebula-sans/social"',
)) {
  throw new Error("social-image card must use the reviewed Nebula Sans payload export");
}
if (!socialImageCardSource.includes('fontFamily: "Nebula Sans"')) {
  throw new Error("social-image proportional copy must use Nebula Sans");
}
if (/Arial|Helvetica/gu.test(socialImageCardSource)) {
  throw new Error("social-image card must not retain legacy sans fallbacks");
}
if (/from "next|from 'next/u.test(socialImageCardSource)) {
  throw new Error("social-image card must stay free of Next.js imports");
}
