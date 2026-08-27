<!-- kb:context scopes/repository--cdb4ee2aea69 -->
# Contents

- `src/discovery.ts` owns validated origins, paths, metadata, crawler policy, sitemaps, manifests, IndexNow payloads, and structured data.
- `src/json-ld.tsx` and `src/social-image.tsx` own the React and Next.js rendering boundaries.
- `src/*.test.ts` holds deterministic examples and property tests for public behavior.
- `scripts/` contains build, package-smoke, inventory, and public-boundary checks.
- `.github/workflows/` runs read-only continuous integration and publishes an immutable release only after tag verification succeeds.
- `.agents/skills/` contains portable cross-repository KB and phased-execution workflows.
- `kb/` contains authored repository rationale, maintained synthesis, and implementation plans.
- `WRITING.md` and `STYLE.md` define the internal and public prose contracts.

# Guidelines

- Keep this package product-neutral and limited to truthful web-discovery primitives shared by concrete Next.js consumers.
- Follow `WRITING.md` for internal prose and `STYLE.md` for public prose.
- Apply unreasonably robust programming when agent work is cheap. Model invalid states out of existence, parse foreign values from `unknown`, and pair readable deterministic regressions with property tests for parsers, ordering, normalization, serialization, and round trips.
- Deliver changes to `main` through a current-head pull request. Keep the stable `Required` CI job green, resolve every review thread, and serialize merges. Human approval stays optional while one regular maintainer would otherwise self-review. Never force-push or bypass the gate.
- Pin Hraness dependencies to reviewed immutable releases or full commits. Never connect repositories through sibling paths, Git submodules, or coordinated `main` assumptions; upgrade each consumer independently.
- Extract another shared package only after two concrete consumers require the same stable, product-neutral interface. Keep product titles, descriptions, routes, update dates, crawler decisions, and visual identity in consumers.
- Freeze package interfaces before parallel lanes begin. Give exports, manifests, lockfiles, generated output, and other convergence surfaces one owner while lanes edit disjoint paths.
- Keep canonical URLs, social metadata, sitemaps, crawler policy, and structured data derived from one validated bare HTTPS origin.
- Model indexable and private surfaces explicitly. Never use `robots.txt` as a substitute for page-level `noindex`, authentication, or authorization.
- Emit only schema that represents visible page content. Do not invent ratings, reviews, prices, authorship, dates, or other unsupported facts.
- Keep social cards deterministic, readable, and free of remote assets or runtime filesystem dependencies. Load the official Nebula Sans Book and Bold payloads only through the reviewed generated Design Kit export.
- Preserve the root, `./json-ld`, and `./social-image` export contracts. Keep React and Next.js as peers. The only runtime dependency is the exact immutable Design Kit release that supplies the social-image font payloads; do not add product dependencies.
- Use Bun 1.3.14 for installs, builds, and tests. Verify every packed runtime export with genuine Node 24 and a real Next.js production build.
- Keep mandatory rules in the closest `AGENTS.md`, executable contracts in types and tests, and pull-based rationale, evidence, synthesis, and plans in `kb/`.
- Run `bun run check` before handoff. Run `bun run kb:refresh`, review the bounded findings, and finish with `bun run kb:check` after material KB edits.
