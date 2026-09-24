# Contents

- `discovery.ts` defines validated site and article metadata, representative-image projection, crawler policy, sitemap, Atom and RSS feed, manifest, submission, and structured-data builders.
- `json-ld.tsx` renders safely serialized JSON-LD at the React boundary.
- `social-image-card.tsx` builds the deterministic 1200×630 social-card element, headline derivation, embedded fonts, adaptive copy fitting, and mark validation without any Next.js import.
- `social-image.tsx` wraps the card in a Next.js `ImageResponse`.
- `index.ts` defines the root public export.
- `*.test.ts` holds deterministic examples and property tests.

# Guidelines

- Accept bare HTTPS origins and root-relative owned paths. Reject credentials, queries, fragments, foreign origins, normalization, duplicate sitemap entries, and malformed colors.
- Keep public metadata complete across canonical, Open Graph, Twitter, and page-level indexability fields.
- Project one checked representative-image record into article metadata, schema, feed enclosures, and sitemap images. Keep captions truthful and product asset provenance in the consumer.
- Keep private metadata free of canonicals and social previews while applying page-level `noindex`.
- Escape JSON-LD for an HTML script context before rendering it.
- Build feed documents as strings with no framework import. Reject characters XML 1.0 cannot represent instead of dropping them, escape every text and attribute value, and prove each feed parses strictly and round-trips its values.
- Keep social-image layout inline and deterministic. Render shared proportional copy with the generated Nebula Sans Book and Bold payloads. Product color and copy remain explicit consumer inputs, while consumer-owned serif or monospace cards remain explicit compositions.
- Add a focused example for each concrete regression and a property test for each general parsing, ordering, normalization, or serialization law.
- Preserve source-first type exports while keeping runtime imports on built `dist/` files.
