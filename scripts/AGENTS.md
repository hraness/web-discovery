# Contents

- `build.ts` produces the three committed ESM runtime exports.
- `package-smoke.ts` verifies the packed artifact with genuine Node, two TypeScript resolution modes, and a real Next.js build.
- `check-public-boundary.ts` rejects private provenance, mutating CI, export drift, and unexpected runtime coupling.
- `check-portfolio-inventory.ts` derives the canonical repository inventory from `package.json`.

# Guidelines

- Keep checks deterministic, fail closed on malformed foreign values, and remove temporary directories in `finally`.
- Test the packed artifact rather than the source tree when proving consumer behavior.
- Keep CI read-only. The verified release publisher is the only workflow job allowed `contents: write`.
- Keep the export map, build entrypoints, package smoke, and public-boundary expectations synchronized.
- Never weaken a check to accommodate drift. Change the owned contract and its evidence together.
