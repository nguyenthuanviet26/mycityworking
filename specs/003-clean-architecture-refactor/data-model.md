# Data Model: Clean Architecture Refactor

No game data changes. This document records the structures that are split or introduced.

## ObjectTypeRules (domain) — split from the old catalog entry

| Field | Type | Source |
|---|---|---|
| `kind` | `"building"` \| `"tree"` \| `"prop"` | old `kind` |
| `size` | `{w, h}` (1×1 or 2×2) | old `size` |
| `hasDamaged` | boolean | `true` exactly when the old entry had `damagedFile` |

## ObjectTypeArt (adapter) — the other half

| Field | Type | Source |
|---|---|---|
| `file` | string | old `file` |
| `damagedFile` | string, optional | old `damagedFile` |

**Invariant**: the two tables have the same 156 keys, and `rules.hasDamaged === !!art.damagedFile`
for every key (checked by an adapter test).

## TerrainArt cache (adapter) — moved out of GameMap

| Field | Type | Notes |
|---|---|---|
| `map` | GameMap | read-only use of `terrain[]`, `variant[]`, `inBounds`, `index` |
| `cache` | Array(cols·rows) of `string[] \| null` | layers per tile |

Invalidation: on `terrainchange` or `tilechange {col,row}` clear the tile and its 8 neighbours.

## GameSession (application) — moved out of main.js

| Field | Type | Notes |
|---|---|---|
| `driftClock` | number (ms) | reset to 0 on `toMenu` |
| `saved` | `{wx, wy, zoom, hovered, selected}` \| null | set on playing→paused, used on paused→playing, cleared on `toMenu` |
| `startView` | `{zoom, center \| null}` | from URL settings; default `{zoom: 1, center: null}` (map centre) |

### State reactions

| Screen change | Session action |
|---|---|
| menu → playing | apply start view; emit `playstart` |
| playing → paused | save view |
| paused → playing | restore view exactly; clear `saved` |
| any → menu via `toMenu` | `saved = null`; clear selection; `driftClock = 0` |

## SelectionPort (application-defined, adapter-implemented)

`{ get() → {hovered, selected}, set({hovered, selected}) }` — implemented in `main.js` over the
input adapter (`input.hovered`, `input.selected`, `input.select()`, `renderer.hovered`).
