# Refactor verification results

Method: headless Chrome via the DevTools protocol (real time), `file://`, 1600×1000 window.
Draw time = average of 120 `renderer.draw()` calls on `?map=big&menu=0&zoom=0.5` while panning
(tight loop, so lower than feature 001's per-frame 3.25 ms). Run-to-run noise is about ±20%.

## Baseline (before any change)

- Tests: 70 passed, 0 failed (`tests.txt`)
- Draw time: 1.35, 1.08, 1.40, 1.12 ms
- `js/main.js`: 155 lines

## Verification after file moves (Phase 2–3)

- Tests: 70 passed, 0 failed; all 70 baseline names present and passing
- Screenshots map-z05, map-z1, map-z2, big-z05: pixel-identical
- Menu: state `menu`, rain on, zoom 0.75 (same as before)
- Draw time: 1.51, 1.43, 1.27 ms — code unchanged, so this spread is measurement noise
- `?map=nope` → error overlay, menu hidden; `?dev=1` → dev mode on after Play;
  `?menu=0` → playing; `neighbors(10,4,"vehicle")` → SE, NW; `collisionAt(-1,0)` → blocked

## After fixing the violations (Phase 4, US2)

- Tests: 81 passed, 0 failed (70 baseline names all present and passing + 3 object-art + 8 game-session)
- Screenshots map-z05, map-z1, map-z2, big-z05: pixel-identical; menu: state `menu`, rain on, zoom 0.75
- Scripted menu flow (feature 002 steps 1–15): 28/28 checks pass
- `js/main.js`: 107 lines (was 155, −31%); contains only settings, creation, wiring and the loop
- Search of `js/domain` and `js/application` for `document|canvas|getContext|Image(|.png|setTimeout|requestAnimationFrame|performance`: no hits
- File layout: every file under `js/` is in `domain/`, `application/`, `adapters/`, `infrastructure/` or is `main.js`

## Architecture check (Phase 5, US3)

- `tests/architecture.test.js`: 4 tests pass → 85 passed, 0 failed
- Planted `document.title;` in `GameMap#getTile` and `if (MCW.Renderer) {}` in `GameSession#update`:
  83 passed, 2 failed ("GameMap uses document", "GameSession uses MCW.Renderer"); removed → 85 passed

## Feature 001 / 002 regression (Phase 6)

- Dev mode (F3), collision overlay (C), grid (G), block tile (B), damage road (V), damage hospital (V),
  markers (M, Shift+M), `accessTile("hospital")` → (19,4): all as before
- Tiny map locked; bad map: unknown char flagged, short row padded, unknown object skipped
- `?map=nope`, `?dev=1`, `?menu=0`, console `neighbors` / `collisionAt`: as before
- Not re-checked here (need a person): real-mouse drag/wheel feel, window resize, Firefox — same open items as before the refactor

## Draw time (big map, 0.5×, 120 draws per run)

| State | Runs (ms) | Median |
|---|---|---|
| Baseline | 1.35, 1.08, 1.40, 1.12 | 1.24 |
| After file moves (code byte-identical) | 1.51, 1.43, 1.27, 1.19, 1.14, 1.29, 1.44, 1.48, 1.20 | 1.29 |
| After refactor | 1.47, 1.39, 1.46, 1.12, 1.35, 1.81, 1.43, 1.47, 1.50 | 1.46 |

Unchanged code already varies ±20% between runs, so this method can't resolve a 10% change.
The median after the refactor is ~13% above the byte-identical runs; the per-frame work is the same
(the tile picture cache moved from the map to `TerrainArt`, object pictures now come from
`objectArt.pictureFor`). All values are under 2 ms of a 16.7 ms frame. SC-006 is therefore
**not proven within 10%** with this method; a quieter machine or a longer A/B run would settle it.

## Bugs found

- None.
