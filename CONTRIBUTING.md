# Contributing

Open an issue before proposing a compatibility change. Export paths, validation rules, emitted metadata shapes, crawler policy, social-image dimensions, and default presentation are public contracts.

Use Bun 1.3.14 and Node 24. Install dependencies and run the complete local gate:

```sh
bun install --frozen-lockfile
bun run check
```

Add a deterministic regression test for every behavior change and a property test for each general parser, ordering, normalization, or serialization law. Keep examples product-neutral and never add credentials, private repository names, deployment URLs, or customer data.
