import { rm } from "node:fs/promises";

if (process.env.NODE_ENV !== "production") {
  const child = Bun.spawn([process.execPath, import.meta.path], {
    env: { ...process.env, NODE_ENV: "production" },
    stderr: "inherit",
    stdout: "inherit",
  });
  process.exit(await child.exited);
}

await rm("./dist", { force: true, recursive: true });

for (const { entrypoint, output } of [
  { entrypoint: "./src/discovery.ts", output: "index.js" },
  { entrypoint: "./src/json-ld.tsx", output: "json-ld.js" },
  { entrypoint: "./src/social-image.tsx", output: "social-image.js" },
] as const) {
  const result = await Bun.build({
    entrypoints: [entrypoint],
    external: [
      "next",
      "next/og",
      "next/og.js",
      "react",
      "react/jsx-dev-runtime",
      "react/jsx-runtime",
    ],
    format: "esm",
    jsx: {
      development: false,
      importSource: "react",
      runtime: "automatic",
    },
    minify: true,
    naming: output,
    outdir: "./dist",
    packages: "external",
    root: "./src",
    sourcemap: "external",
    splitting: false,
    target: "node",
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error(
      `Bun failed to build @hraness/web-discovery entrypoint ${entrypoint}`,
    );
  }
}
