# Vendored: aliftype/kashida-js

**Source:** https://github.com/aliftype/kashida-js (branch `main`)
**Author:** Khaled Hosny <khaled@aliftype.com> (+ Yanone)
**License:** Apache License 2.0 — see `LICENSE.txt` in this directory.
**Upstream package:** `kashida` 0.1.0 (`"type": "module"`, ESM — imported as-is, no modifications).

## Why vendored instead of npm-installed

`kashida-js` is **not published on npm** (verified 2026-09-15). Vendoring the
four tiny files (~60 KB total) is the simplest deterministic option and is
explicitly permitted by Apache-2.0 (§4 redistribution, license + notices kept).

## Files

| File                | Purpose                                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| `kashida.js`        | `findKashidaPoints`, `insertKashidas`, `makeKashidaString`, `Algorithm`, `Kashida` |
| `arabic_joining.js` | Unicode joining-group/type tables                                                  |
| `test.js`           | Upstream mocha tests (reference; needs chai/mocha, not run here)                   |
| `package.json`      | Upstream metadata (provenance only)                                                |
| `LICENSE.txt`       | Apache-2.0 (MUST keep with any redistribution)                                     |

## Verified behavior (read the source before use)

- Only `Algorithm.SIMPLE` is implemented; `NASKH` throws. Do not advertise Naskh.
- Priorities are rule order 1→7; **lower number = more preferable**; the
  default single insertion picks the lowest-numbered point (one kashida/word,
  per "The Big Kashida Secret" / Khatt Foundation rule).
- `insertKashidas(word, points, allKashidas=true)` inserts exactly one U+0640
  per entry; pass duplicate entries at one index to stack elongations.

## Updating

Re-download from the source URL above, keep `LICENSE.txt`, and note the new
commit in `.opencode/arabic/catalog.json` if the API changes.
