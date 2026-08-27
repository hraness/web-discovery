import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { delimiter, join, resolve } from "node:path";

const packageName = "@hraness/web-discovery";
const importSpecifiers = [
  packageName,
  `${packageName}/json-ld`,
  `${packageName}/social-image`,
];
const verificationPackages = [
  "@types/node@^24.10.0",
  "@types/react@^19.2.14",
  "@types/react-dom@^19.2.3",
  "next@16.2.12",
  "react@19.2.3",
  "react-dom@19.2.3",
  "typescript@^6.0.3",
];

const repository = process.cwd();
const work = await mkdtemp(join(repository, ".package-smoke-"));
const cache = join(work, "cache");
const temporary = join(work, "tmp");
const environment = {
  ...process.env,
  BUN_INSTALL_CACHE_DIR: cache,
  BUN_TMPDIR: temporary,
  TMPDIR: temporary,
};

async function run(command: string[], cwd: string): Promise<void> {
  const child = Bun.spawn(command, {
    cwd,
    env: environment,
    stderr: "inherit",
    stdout: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(
      `Command failed (${String(exitCode)}): ${command.join(" ")}`,
    );
  }
}

function resolveGenuineNodeExecutable(): string {
  const executableName = process.platform === "win32" ? "node.exe" : "node";
  const identityProbe = [
    "if (typeof Bun !== 'undefined'",
    "|| process.versions.bun !== undefined",
    "|| !process.versions.node?.startsWith('24.')) process.exit(1)",
  ].join(" ");
  const candidates = [...new Set(
    (process.env.PATH ?? "")
      .split(delimiter)
      .filter((directory) => directory.length > 0)
      .map((directory) => resolve(directory, executableName)),
  )];

  for (const executable of candidates) {
    try {
      const probe = Bun.spawnSync([
        executable,
        "--input-type=commonjs",
        "-e",
        identityProbe,
      ], {
        env: environment,
        stderr: "ignore",
        stdin: "ignore",
        stdout: "ignore",
      });
      if (probe.exitCode === 0) return executable;
    } catch {
      // Continue past absent, inaccessible, or incompatible PATH candidates.
    }
  }

  throw new Error("package smoke requires a genuine Node 24 executable on PATH");
}

try {
  const archive = join(work, "package.tgz");
  const consumer = join(work, "consumer");
  await mkdir(cache, { mode: 0o700 });
  await mkdir(temporary, { mode: 0o700 });
  await mkdir(consumer);
  const nodeExecutable = resolveGenuineNodeExecutable();

  await run([
    process.execPath,
    "pm",
    "pack",
    "--filename",
    archive,
    "--ignore-scripts",
    "--quiet",
  ], repository);
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  await run([
    process.execPath,
    "add",
    archive,
    ...verificationPackages,
    "--ignore-scripts",
  ], consumer);

  await run([
    nodeExecutable,
    "--input-type=module",
    "-e",
    `await Promise.all(${JSON.stringify(importSpecifiers)}.map((specifier) => import(specifier)))`,
  ], consumer);
  await run([
    nodeExecutable,
    "--input-type=module",
    "-e",
    [
      `const { createSocialImageResponse } = await import(${JSON.stringify(`${packageName}/social-image`)});`,
      'const response = createSocialImageResponse({ description: "Installed package", domain: "example.com", title: "Nebula Sans" });',
      "const bytes = new Uint8Array(await response.arrayBuffer());",
      "if (bytes.length < 1_000 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) throw new Error(\"installed social-image export did not render a PNG\");",
    ].join(" "),
  ], consumer);

  const installedRoot = join(
    consumer,
    "node_modules",
    "@hraness",
    "web-discovery",
  );
  if (
    await Bun.file(join(installedRoot, "src", "discovery.test.ts")).exists()
    || await Bun.file(join(installedRoot, "src", "discovery.property.test.ts")).exists()
  ) {
    throw new Error("installed package must not contain source tests");
  }

  await writeFile(
    join(consumer, "index.tsx"),
    [
      'import { createPublicSiteMetadata, type SearchSite } from "@hraness/web-discovery";',
      'import { JsonLdScript } from "@hraness/web-discovery/json-ld";',
      'import { createSocialImageResponse } from "@hraness/web-discovery/social-image";',
      'const site = { description: "Example", name: "Example", origin: "https://example.com", title: "Example" } as const satisfies SearchSite;',
      "const metadata = createPublicSiteMetadata(site);",
      'const schema = <JsonLdScript data={{ "@type": "WebSite" }} id="schema" />;',
      'const image = createSocialImageResponse({ description: "Example", domain: "example.com", title: "Example" });',
      "void [metadata, schema, image];",
      "",
    ].join("\n"),
  );
  const sharedCompilerOptions = {
    target: "ES2024",
    lib: ["ES2024", "DOM", "DOM.Iterable"],
    jsx: "react-jsx",
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: ["node"],
  };
  await writeFile(
    join(consumer, "tsconfig.bundler.json"),
    JSON.stringify({
      compilerOptions: {
        ...sharedCompilerOptions,
        module: "Preserve",
        moduleResolution: "Bundler",
      },
      include: ["index.tsx"],
    }, null, 2),
  );
  await writeFile(
    join(consumer, "tsconfig.nodenext.json"),
    JSON.stringify({
      compilerOptions: {
        ...sharedCompilerOptions,
        module: "NodeNext",
        moduleResolution: "NodeNext",
      },
      include: ["index.tsx"],
    }, null, 2),
  );
  await run(
    [process.execPath, "x", "tsc", "-p", "./tsconfig.bundler.json"],
    consumer,
  );
  await run(
    [process.execPath, "x", "tsc", "-p", "./tsconfig.nodenext.json"],
    consumer,
  );

  await mkdir(join(consumer, "app"));
  await writeFile(
    join(consumer, "app", "layout.tsx"),
    [
      'import { JsonLdScript } from "@hraness/web-discovery/json-ld";',
      "export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {",
      '  return <html><body><JsonLdScript data={{ "@type": "WebSite" }} id="schema" />{children}</body></html>;',
      "}",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(consumer, "app", "page.tsx"),
    [
      'import { createPublicSiteMetadata } from "@hraness/web-discovery";',
      'export const metadata = createPublicSiteMetadata({ description: "Package smoke", name: "Package smoke", origin: "https://example.com", title: "Package smoke" });',
      "export default function Page() { return <main>Web discovery package smoke</main>; }",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(consumer, "app", "opengraph-image.tsx"),
    [
      'import { createSocialImageResponse, socialImageContentType as contentType, socialImageSize as size } from "@hraness/web-discovery/social-image";',
      'export const alt = "Web discovery package smoke";',
      "export { contentType, size };",
      'export default function Image() { return createSocialImageResponse({ description: "Package smoke", domain: "example.com", title: "Web discovery" }); }',
      "",
    ].join("\n"),
  );
  await run([
    nodeExecutable,
    join(consumer, "node_modules", "next", "dist", "bin", "next"),
    "build",
  ], consumer);
} finally {
  await rm(work, { force: true, recursive: true });
}
