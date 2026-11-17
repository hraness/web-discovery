# Nebula Sans provenance

- Family: Nebula Sans
- Version: 1.010
- Use: the proportional face of the social card (`social-fonts.generated.ts`)
- Upstream: https://www.nebulasans.com/
- Source archive: https://www.nebulasans.com/download/NebulaSans-1.010.zip
- Archive SHA-256: `a9b56ef15e24b6e8195af7457cc75f714ecf5501fc3c20a69f546c8f589e7bdb`
- Files: `OTF/NebulaSans-Book.otf` and `OTF/NebulaSans-Bold.otf` from that archive, unchanged
- License: SIL Open Font License 1.1, the archive's `license.txt` retained unchanged as `LICENSE.txt`
- Checked: 2026-11-17, against a fresh download of the archive above

| File | SHA-256 |
| --- | --- |
| `NebulaSans-Book.otf` | `4cc650f856591af1affc4add4f50e260c8239a2542bafe77909b78006023f091` |
| `NebulaSans-Bold.otf` | `91617d3e2281e8213f64f6bf359f387022d3149b35000b38365c32130a25bfa8` |
| `LICENSE.txt` | `ceab45a6fcb5cce75ffb7e2a4f49b59dd2daa6ede14fe4b07b9f8e58675f33b8` |

These files previously reached this package through the `@hraness/design-kit`
v0.5.0 runtime dependency, which carried the same bytes. `bun run
generate:nebula-social-fonts` embeds the two OTF files as base64 in
`social-fonts.generated.ts`; the test in `src/nebula-sans-fonts.test.ts`
fails when the module, the font files, or this record drift apart.

Nebula Entertainment & Broadcasting LLC reserves the font name `Nebula`; this
package distributes the unmodified original files under that name.
