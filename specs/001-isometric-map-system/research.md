# Phase 0 Research: Isometric Tile Map System

All Technical Context unknowns are resolved below. Each entry: Decision / Rationale /
Alternatives considered.

## R1. Rendering technology

- **Decision**: Plain HTML5 Canvas 2D (`CanvasRenderingContext2D.drawImage`) with no game
  library.
- **Rationale**:
  - Constitution VI: zero install, browser-only, and the game SHOULD start from `index.html`
    opened from disk. Images loaded through `<img>`/`new Image()` work over `file://`; drawing
    them to a canvas works (the canvas becomes "tainted", which only blocks pixel read-back,
    which we never need).
  - Phaser 3's loader fetches images via XHR, which Chrome blocks on `file://`, so it would
    break the "open from disk" path.
  - Load at worst: a 100×100 map at 0.5× zoom on a 1920×1080 window shows roughly
    30 columns × 70 rows of diamonds ≈ 1,500–2,500 `drawImage` calls per frame including
    objects — well within Canvas 2D's budget at 60 FPS on a mid-range laptop.
  - Constitution V: no dependency is simpler than any dependency.
- **Alternatives considered**: Phaser 3 (good isometric support, but `file://` loading
  issues and a large API to learn); PixiJS (fast WebGL, same `file://` issues for its
  loader, more than we need); DOM/CSS-transformed tiles (too many elements for 10,000 tiles).

## R2. Code organisation without a build step

- **Decision**: Classic `<script>` files (not ES modules), loaded in a fixed order by
  `index.html`. Each file is wrapped in an IIFE and attaches its exports to one global
  namespace object, `window.MCW`.
- **Rationale**: Browsers block `<script type="module">` over `file://` (CORS), which would
  break double-click-to-play. Classic scripts work everywhere and need no bundler.
  A single namespace keeps globals to one name.
- **Alternatives considered**: ES modules (cleanest, but only work from a web server);
  one big file (unmaintainable for a team).

## R3. Map definition loading

- **Decision**: Each map is a `.js` file in `maps/` that calls
  `MCW.maps.register({ id, terrain: \`...\`, legend?, objects: [...] })`, with the terrain
  grid written as a template string (one line per row, one character per tile). See
  [contracts/map-definition.md](./contracts/map-definition.md).
- **Rationale**: Matches the clarification (hand-written text grid + object list).
  A `.js` file is loaded with a `<script>` tag, so it works over `file://`, unlike
  `fetch()` of a `.json` or `.txt` file.
- **Alternatives considered**: JSON loaded with `fetch` (blocked on `file://`); Tiled editor
  export (rejected in clarification).

## R4. Coordinate system and projection

- **Decision**: Three coordinate spaces.

  | Space | Units | Notes |
  |---|---|---|
  | Tile address | integer `(col, row)` | `(0,0)` is the top (north) corner of the map |
  | Map position | fractional `(x, y)` | tile `(c, r)` covers `c ≤ x < c+1`, `r ≤ y < r+1`; centre is `(c+0.5, r+0.5)` |
  | World pixels | `(wx, wy)` at zoom 1 | `wx = (x − y) · 64`, `wy = (x + y) · 32` (half of the 128×64 tile) |
  | Screen pixels | canvas CSS pixels | `sx = (wx − cam.wx) · zoom + viewW/2`, `sy = (wy − cam.wy) · zoom + viewH/2` |

  Inverse (picking): `x = (wx/64 + wy/32) / 2`, `y = (wy/32 − wx/64) / 2`, tile =
  `(floor(x), floor(y))`. Exact for the diamond, so hovering on diamond edges is correct.
- **Directions** (verified against the asset pack while drawing the test map):
  `NE = (0, −1)`, `SE = (+1, 0)`, `SW = (0, +1)`, `NW = (−1, 0)` in `(Δcol, Δrow)`.
- **Rationale**: Standard "diamond" isometric math; a single pair of formulas serves
  characters (fractional positions) and tiles (integers).
- **Alternatives considered**: Staggered isometric rows (awkward neighbour math, harder
  routing); storing positions in pixels (couples logic to zoom and art size).

## R5. Road autotiling

- **Decision**: 4-bit neighbour mask over (NE, SE, SW, NW): a neighbour counts if it is
  `road` or `bridge`. The mask selects the file below (derived by sampling the curb pixels
  on each tile edge in the asset pack; all 15 non-empty masks are covered).

  | Open sides | File (`Roads and Grounds/`) |
  |---|---|
  | NE | `tile_road_end_SW_normal.png` |
  | SE | `tile_road_end_NW_normal.png` |
  | SW | `tile_road_end_NE_normal.png` |
  | NW | `tile_road_end_SE_normal.png` |
  | NE+SW | `tile_road_straight_SW_normal.png` |
  | SE+NW | `tile_road_straight_SE_normal.png` |
  | SE+SW | `tile_road_corner_N_normal.png` |
  | NW+SW | `tile_road_corner_E_normal.png` |
  | NE+NW | `tile_road_corner_S_normal.png` |
  | NE+SE | `tile_road_corner_W_normal.png` |
  | NE+NW+SE | `tile_road_intersection_NE_normal.png` |
  | NE+NW+SW | `tile_road_intersection_NW_normal.png` |
  | NE+SE+SW | `tile_road_intersection_SE_normal.png` |
  | NW+SE+SW | `tile_road_intersection_SW_normal.png` |
  | all four | `tile_road_xsing_normal.png` |
  | none (isolated) | `tile_road_xsing_normal.png` |

  The `damaged` variant swaps `_normal` for `_damaged`. Bridges: `tile_road_bridge_body_SE_*`
  when the bridge's neighbours are along SE/NW, `..._SW_*` along NE/SW.
- **Rationale**: Author only writes `r`; correct pieces appear automatically (FR-004).

## R6. Shoreline autotiling

- **Decision**: Transition art is drawn on **land** tiles next to water; water tiles always
  use `tile_ground_water.png`. For a land tile, look at its 4 side neighbours and 4 corner
  (diagonal) neighbours:
  1. Exactly one water side `D` → `tile_ground_<ground>_water_<D>_clean.png` (water along that side).
  2. Two adjacent water sides (e.g. NE+NW) → `..._wateredge_<corner between them>_clean.png`
     (NE+NW→N, NE+SE→E, SE+SW→S, SW+NW→W): mostly water, land in the opposite corner.
  3. No water side but a water diagonal at corner `C` (N/E/S/W) → `..._watercorner_<C>_clean.png`.
  4. Anything else (opposite sides, three sides) → plain ground tile (author should avoid it;
     reported as a map warning).

  `<ground>` is `grass` or `dirt` (the only grounds with shoreline art). Shoreline tiles keep
  their land collision.
- **Rationale**: Mapping confirmed by sampling the asset pixels (water vs land at each edge
  and corner). Covers straight canals, bends and canal ends.
- **Alternatives considered**: Draw transitions on water tiles (asset art is land-based, so
  it would not match).

## R7. Depth ordering

- **Decision**: Draw in two passes. Pass 1: all terrain tiles in row-major order (they are
  flat, so order doesn't matter visually). Pass 2: objects and future characters sorted by
  depth key `x + y` of their **front-most point** — for an object with footprint `w × h`
  anchored at `(c, r)` the key is `(c + w) + (r + h)`; for a character at map position
  `(x, y)` it is `x + y`. Ties are broken by `x`.
- **Rationale**: Standard painter's algorithm for diamond isometric; correct for 1×1 and
  2×2 footprints, which is all the asset pack has.

## R8. Culling and performance

- **Decision**: Each frame, convert the four screen corners to map positions, take the
  min/max col/row, pad by 2 tiles (tall buildings), and only draw tiles/objects inside.
  Render on `requestAnimationFrame` only when something changed (camera moved, hover changed,
  variant/collision changed, developer mode on) — a "dirty" flag.
- Canvas is sized to `window.innerWidth/innerHeight × devicePixelRatio` and `imageSmoothingEnabled`
  stays on (art is not pixel art).
- **Rationale**: Meets SC-002 for 100×100 maps; idle frames cost nothing.

## R9. Camera rules

- **Decision**:
  - Zoom range 0.5–2.0, default 1.0. Wheel: multiply by 1.1 per notch (`deltaY` sign only,
    so trackpads can't jump); +/− keys: same step about the screen centre.
  - Zoom-at-cursor: keep the world point under the cursor fixed:
    `cam = worldUnderCursor − (cursor − viewCentre) / newZoom`.
  - Bounds: the map's world bounding box (`wx ∈ [−rows·64, cols·64]`, `wy ∈ [0, (cols+rows)·32]`)
    plus a 64 px margin. Camera centre is clamped so the viewport stays inside the box; on an
    axis where the box is smaller than the viewport, the camera is locked to the box centre.
  - Keyboard scroll speed: 600 screen px/s, divided by zoom to get world px (same on-screen
    speed at any zoom).
  - Drag threshold: a pointer movement under 5 px between down and up counts as a click.
  - `centerOn(pos, {smooth})`: smooth glide uses ease-out over 300 ms.
- **Rationale**: Implements FR-010–FR-016 with pure functions that can be unit-tested.

## R10. Collision model

- **Decision**: `Collision = { foot: boolean, vehicle: boolean, cost: number }`. Effective
  collision = combine(terrain default, object collision if any, override if any), where
  `foot`/`vehicle` are AND-ed and `cost` takes the maximum. Out-of-map → `{false, false, Infinity}`.
  Overrides are stored in a sparse `Map<index, Collision>` and fire a `collisionchange` event.
- **Rationale**: "Most restrictive wins" (FR-023); sparse overrides keep runtime changes cheap.

## R11. Access tile for buildings (open clarification)

- **Decision (provisional)**: Each object may declare an `access` tile in the map
  definition; if absent, it defaults to the first vehicle-passable tile found next to its
  footprint, searching the front sides first (SE, SW, then NE, NW). This is the recommended
  option from `/speckit-clarify` Q2, which was not answered before planning; it does not affect
  any acceptance test in this feature and can be changed cheaply in the routing feature.

## R12. Testing approach

- **Decision**: `tests/index.html` loads the same `js/core/*.js` files as the game plus a
  ~60-line in-repo harness (`tests/harness.js`: `describe`, `it`, `assertEqual`,
  `assertClose`, `assertThrows`) and the `*.test.js` files, then shows pass/fail in the page
  and the console. Open it in a browser — no install.
- **Rationale**: Constitution III + VI. A tiny harness avoids even a CDN dependency and works
  offline and over `file://`.
- **Alternatives considered**: Mocha + Chai from CDN (fine, but adds a network dependency and
  more to load than we need); Node test runner (requires install — forbidden).

## R13. Asset loading

- **Decision**: Load only the images a map actually uses. A manifest (`js/render/assets.js`)
  maps logical keys (e.g. `road:corner_N:normal`, `bld:hospital_a:damaged`) to paths under
  `Isometric City/` (paths URL-encoded because the folder names contain spaces). A loading
  screen shows progress; a failed image is replaced by a magenta placeholder diamond and
  logged (spec US1 scenario 5).
- **Anchoring**: tiles are drawn with their bottom edge at the diamond's bottom (`y + 64 − h`),
  which handles the taller bridge tiles; objects are horizontally centred on their footprint
  and bottom-aligned to the footprint's front corner.
- **Rationale**: Whole pack is 4.8 MB (within budget), but loading only what's needed keeps
  start-up well under 5 s (SC-001).
