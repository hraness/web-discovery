import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "..");
const ignoredDirectories = new Set([".git", "dist", "node_modules"]);
const textExtensions = new Set([
  "", ".json", ".md", ".mjs", ".ts", ".tsx", ".yml", ".yaml",
]);
const writeCapabilities = [
  ["packages", "write"].join(": "),
  ["id-token", "write"].join(": "),
  ["pull-requests", "write"].join(": "),
  ["npm", "publish"].join(" "),
];
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
    for (const capability of writeCapabilities) {
      if (contents.includes(capability)) {
        throw new Error(
          `${relative(repositoryRoot, path)} contains mutating release capability ${capability}`,
        );
      }
    }
    if (
      contents.includes(["contents", "write"].join(": "))
      && relative(repositoryRoot, path) !== ".github/workflows/release.yml"
    ) {
      throw new Error(
        `${relative(repositoryRoot, path)} has unexpected contents write access`,
      );
    }
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
};
const expectedExports = {
  ".": {
    types: "./src/index.ts",
    import: "./dist/index.js",
    default: "./dist/index.js",
  },
  "./json-ld": {
    types: "./src/json-ld.tsx",
    import: "./dist/json-ld.js",
    default: "./dist/json-ld.js",
  },
  "./social-image": {
    types: "./src/social-image.tsx",
    import: "./dist/social-image.js",
    default: "./dist/social-image.js",
  },
};
if (JSON.stringify(manifest.exports) !== JSON.stringify(expectedExports)) {
  throw new Error("package exports must expose the three reviewed entrypoints");
}
if (JSON.stringify(manifest.peerDependencies) !== JSON.stringify({
  next: ">=16.2.0 <17.0.0",
  react: ">=19.0.0 <20.0.0",
})) {
  throw new Error("package must declare only the supported Next.js and React peers");
}
if (JSON.stringify(manifest.dependencies) !== JSON.stringify({
  "@hraness/design-kit": "github:hraness/design-kit#v0.2.1",
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
if (!socialImageSource.includes(
  'from "@hraness/design-kit/fonts/nebula-sans/social"',
)) {
  throw new Error("social-image runtime must use the reviewed Nebula Sans payload export");
}
if (!socialImageSource.includes('fontFamily: "Nebula Sans"')) {
  throw new Error("social-image proportional copy must use Nebula Sans");
}
if (/Arial|Helvetica/gu.test(socialImageSource)) {
  throw new Error("social-image runtime must not retain legacy sans fallbacks");
}
