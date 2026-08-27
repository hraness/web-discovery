# Contents

- `discovery.ts` defines validated site metadata, crawler policy, sitemap, manifest, submission, and structured-data builders.
- `json-ld.tsx` renders safely serialized JSON-LD at the React boundary.
- `social-image.tsx` builds deterministic 1200×630 Next.js social-image responses.
- `index.ts` defines the root public export.
- `*.test.ts` holds deterministic examples and property tests.

# Guidelines

- Accept bare HTTPS origins and root-relative owned paths. Reject credentials, queries, fragments, foreign origins, normalization, duplicate sitemap entries, and malformed colors.
- Keep public metadata complete across canonical, Open Graph, Twitter, and page-level indexability fields.
- Keep private metadata free of canonicals and social previews while applying page-level `noindex`.
- Escape JSON-LD for an HTML script context before rendering it.
- Keep social-image layout inline and deterministic. Render shared proportional copy with the generated Nebula Sans Book and Bold payloads. Product color and copy remain explicit consumer inputs, while consumer-owned serif or monospace cards remain explicit compositions.
- Add a focused example for each concrete regression and a property test for each general parsing, ordering, normalization, or serialization law.
- Preserve source-first type exports while keeping runtime imports on built `dist/` files.
