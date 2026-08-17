---
title: Repository seams
type: concept
tags:
  - architecture
  - dependencies
  - repositories
repository_scopes:
  - AGENTS.md
  - package.json
  - src
---

# Repository seams

Web Discovery owns validated bare HTTPS origins, root-relative owned paths, coherent Next.js metadata, crawler policy, sitemaps, web manifests, IndexNow payloads, visible-content structured data, safe JSON-LD rendering, and deterministic social-image responses. Authentication, authorization, application routing, product facts, editorial decisions, update dates, brand identity, and page composition remain with consumers.

The package declares only Next.js and React peers and no runtime dependency. Any future shared dependency must use a reviewed immutable release or full commit so consumers can upgrade independently. Do not connect development through sibling paths, Git submodules, or coordinated `main` workflows. Extract another shared package only after two concrete consumers need the same stable, product-neutral interface.

The root export stays usable without importing either rendering boundary. `./json-ld` owns React script rendering. `./social-image` owns the Next.js `ImageResponse` boundary. This split lets consumers take only the contract they need while all three exports share one validation model.

Freeze export and validation contracts before parallel consumer migrations. Give the package manifest, export map, generated output, and lockfile one owner while independent lanes change disjoint consumers. Each consumer pins an immutable release and can upgrade without waiting for coordinated repository work.

## Related

The normative rules remain in the root `AGENTS.md`. [[documentation-ownership|Documentation ownership]] explains how those rules relate to executable contracts and this pull-based context.
