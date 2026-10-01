# Contributing

Open an issue before proposing a compatibility change. Export paths, validation rules, emitted metadata shapes, crawler policy, social-image dimensions, and default presentation are public contracts.

Use Bun 1.3.14 and Node 24. Install dependencies and run the complete local gate:

```sh
bun install --frozen-lockfile
bun run check
```

Add a deterministic regression test for every behavior change and a property test for each general parser, ordering, normalization, or serialization law. Keep examples product-neutral and never add credentials, private repository names, deployment URLs, or customer data.

## What the checks cover

`bun run check` validates the repository inventory, package entry points,
dependency pins, and release workflow permissions. It scans for private paths
and identities, lints and typechecks the source, rebuilds the committed runtime
exports, runs the example and property tests, and packs the package.

The package smoke check imports every runtime export and renders a PNG through
`ImageResponse` and through `satori` with `@resvg/resvg-js` on Node 24. It also
typechecks installed consumers with Bundler and NodeNext resolution and runs
a Next.js production build.
