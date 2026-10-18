# Quickstart & Validation: Isometric Tile Map System

## Prerequisites

- A current desktop Chrome, Edge or Firefox. Nothing to install.

## Run

- **From disk**: double-click `index.html` in the repository root.
- **From a static host** (optional): any static server or host serving the repository folder,
  then open `/index.html`.

Expected: a short loading bar, then the sample city (≥ 30×30 tiles) fills the window within
5 seconds (SC-001). The developer console shows no errors.

## Unit tests (game logic)

- Open `tests/index.html` in the browser.
- Expected: every test listed green and a summary line `N passed, 0 failed`. Covered areas:
  coordinate conversions (`MCW.iso`), map parsing and warnings, road and shoreline autotiling
  masks, collision combination and overrides, neighbour queries, camera clamping and
  zoom-at-point.

## Playtest checklist

Run with the sample map. Press `F3` for developer mode where noted.
See [contracts/controls.md](./contracts/controls.md) for all keys.

| # | Steps | Expected | Spec |
|---|---|---|---|
| 1 | Look over the whole map | Grass, dirt, concrete, water, roads, bridges, buildings, trees visible; no gaps | US1-1 |
| 2 | Inspect every road junction | Each piece joins its neighbours; no mismatched curbs | US1-2, SC-004 |
| 3 | Follow the canal | Shoreline edges/corners continuous | US1-3 |
| 4 | Look at the hospital (2×2) and nearby houses | Drawn once; nearer things cover farther things | US1-4 |
| 5 | Edit `maps/sample-city.js`: add an unknown char `?`, reload | Game still starts; magenta outline on that tile; console warning | US1-5 |
| 6 | Drag the map | Map follows the pointer one-to-one | US2-1 |
| 7 | Hold arrows/WASD at zoom 0.5× and 2× | Same on-screen speed | US2-2 |
| 8 | Scroll hard against each of the 4 edges | View stops at the edge | US2-3, SC-005 |
| 9 | Wheel-zoom over a building | Building stays under the cursor | US2-4 |
| 10 | Zoom past both limits | Stops at 0.5× and 2× | US2-5 |
| 11 | Resize the window | Map fills it; still in bounds | US2-6 |
| 12 | Load a 5×5 test map (`?map=tiny`) | Centred, cannot scroll | US2-7 |
| 13 | Dev mode: hover tile edges at several zooms | Highlight always matches the diamond under the cursor | US3-1, SC-003 |
| 14 | Move cursor off the map | No highlight | US3-2 |
| 15 | Dev mode: click a tile | Panel shows col,row, terrain, object, collision | US3-3 |
| 16 | Dev mode: `M` on a tile and between two tiles, then pan/zoom | Markers stay put; correct depth vs buildings | US3-4, US3-5 |
| 17 | Drag then release over a tile | No selection | US3-6 |
| 18 | Dev mode: `C` | Roads green, grass yellow, water/buildings/trees red | US4-1, SC-007 |
| 19 | Dev mode: select a hospital tile | Collision impassable on all 4 footprint tiles | US4-2 |
| 20 | Dev mode: select a road, `B`, then `B` again | Turns red then back to green immediately | US4-4 |
| 21 | Dev mode: `V` on a road and on a building | Swaps to damaged art and back | FR-009 |
| 22 | Dev mode: FPS reading while panning a 100×100 map (`?map=big`) | Steady ~60 FPS | SC-002 |

## Console checks for future features

In the developer console:

```js
MCW.game.map.neighbors(10, 4, "vehicle")   // passable road neighbours with dir and cost
MCW.game.map.collisionAt(-1, 0)             // {foot:false, vehicle:false, cost:Infinity}
MCW.game.camera.centerOn(5.5, 5.5, { smooth: true })
```

## Playtest log

### 2026-10-17 — automated run (headless Chrome 1920×1080 / 1600×1000, file://)

Checks were driven by screenshots, scripted key events and direct camera calls, because no
human was at the mouse. Steps marked **manual** still need a person with a real mouse and
keyboard.

| # | Result | How verified |
|---|---|---|
| 1 | ✅ Pass | Screenshots at 0.5×, 1×, 1.6×: all terrain types, roads, bridges, buildings, trees visible |
| 2 | ✅ Pass | Every piece type (straight, corner, T, crossroads, dead end) joins cleanly; autotile unit tests cover all 16 masks |
| 3 | ✅ Pass | Canal and park pond shorelines are continuous, including under the bridges |
| 4 | ✅ Pass | Hospital (2×2) drawn once; base centred on its footprint; nearer objects cover farther ones |
| 5 | ✅ Pass | Test map with `?`, a short row and an unknown object: game starts, magenta outline, 3 console warnings |
| 6 | ⏳ Manual | Drag code path pans by pointer delta (`camera.panBy`); needs a real drag to confirm the feel |
| 7 | ⏳ Manual | Speed formula unit-tested (600 screen px/s at any zoom); needs a held-key check |
| 8 | ✅ Pass | Unit test: panning far past each of the 4 edges stops at the bound |
| 9 | ✅ Pass (logic) / ⏳ Manual (wheel) | Unit test: `zoomAt` keeps the point under the cursor fixed |
| 10 | ✅ Pass | Unit test: zoom clamps to 0.5 and 2 |
| 11 | ⏳ Manual | Resize handler wired (`renderer.resize` + `camera.setView`); needs a real window resize |
| 12 | ✅ Pass | `?map=tiny`: map centred; scripted `panBy(300,200)` does not move the camera |
| 13 | ✅ Pass | Unit tests: tile centres and points 1 px inside each diamond corner pick the right tile at 0.5×/1×/1.7× |
| 14 | ✅ Pass | Unit test: off-map point (and NaN) returns no tile |
| 15 | ✅ Pass | Dev panel shows hovered/selected tile, terrain, variant, object, collision |
| 16 | ✅ Pass | Markers at (18.5, 8.0) and (19.0, 7.5) drawn on the tile and on the tile edge; correct depth vs hospital |
| 17 | ⏳ Manual | Click threshold (< 5 px) is in code; needs a real drag-and-release |
| 18 | ✅ Pass | Collision overlay: roads green, grass and shorelines yellow, water/buildings/trees red |
| 19 | ✅ Pass | Unit test: all four hospital tiles blocked |
| 20 | ✅ Pass | `B` on road (18,10) turns it red; unit tests cover set/clear and events |
| 21 | ✅ Pass | `V` on road (5,9) shows damaged art; panel shows `[damaged]` |
| 22 | ⏳ Manual | Headless can't measure FPS. Worst case at 0.5× on 1920×1080: ~2,050 draw calls/frame (was ~3,900 before horizontal culling); ~560 at 1× |

Console checks: `neighbors(18,14,"vehicle")` returns 4 road neighbours; `accessTile("hospital")`
returns (19,4); `collisionAt(-1,0)` is blocked. Unit tests: 50 passed, 0 failed in Chrome and Edge.
