# CaptAIn

A browser game about repairing a city during the rainy season, by Team CaptAIn (Thuan Viet,
Phuong Nghi, Thy Phuong, Dieu Le). So far: the CaptAIn main menu (with How to Play, Credits
and an in-game pause menu), the isometric city map — terrain, roads, buildings, camera,
tile picking and collision — the playable **trial level** (send a repair truck to storm
damage before the city's condition runs out), plus a map decorator for developers.

Plain HTML, CSS and JavaScript — nothing to install, no build step, no server.

## Play

Open `index.html` in a current Chrome, Edge or Firefox (double-click works), or serve the
folder from any static host. The game opens on the main menu; press **Play**. Press **Esc**
(or the pause button, top right) to pause.

**Play** starts the **trial level** (feature 005): a four-minute storm on a small city in three
phases — *Drizzle*, *Downpour*, *Peak storm*. Roads crack, roofs get damaged, streetlights fall
and the pump station fails. You have four crews (feature 006): **Road Crew**, **Builders**,
**Electricians** and **Drainage Team**, each in its own vehicle with a named leader. Each crew is
**Best** at one kind of damage, **can help** with some others (twice as slow, no bonus) or
**can't fix** it, and each has an advantage (see the Crew guide in How to Play). Click an
incident: the panel lists every crew with its badge, arrival and repair time, with the best
free crew already picked — press Send. Or click a crew in the crew bar first, then the
incident. Incidents left too long turn urgent and wear down the *City condition* meter; every
repair wins a little back. Repair 10 incidents before the storm ends to win (keep repairing
for up to 3 stars). Hints guide the first repair; switching to another tab pauses the game.

Optional URL settings: `?menu=0` (skip the menu), `?map=sample-city|tiny|big` (any map other
than the trial city opens in free look, with no level), `?zoom=0.5`, `?center=10,12`, `?dev=1`.

## Controls

| Input | Action |
|---|---|
| Drag | Pan |
| Wheel | Zoom towards the cursor |
| Arrow keys / WASD | Scroll |
| `+` / `-` | Zoom |
| `Home` | Reset view |
| Click | Select a tile, or open an incident |
| `1`–`4` | Pick that crew in the open incident panel, or arm it for crew-first sending |
| Click a crew card, then an incident | Send that crew (incidents it can't fix are dimmed) |
| `Enter` / `Space` | Send (or redirect) the picked crew to the open incident |
| `Tab` | Next incident (urgent first) |
| `C` | Find the picked or armed crew (when developer mode is off); double-click a crew card or press ⌖ for any crew |
| `?` (crew bar) | Pause and open How to Play with the Crew guide |
| `Esc` | Close the incident panel or cancel an armed crew; pause / resume; back out of menu panels |
| `F3` or `` ` `` | Developer mode (`C` collision, `G` grid, `M` marker, `B` block tile, `V` damage) |

Full list: [specs/001-isometric-map-system/contracts/controls.md](specs/001-isometric-map-system/contracts/controls.md)

## Tests

Open `tests/index.html` in the browser. All game-logic tests run on the page and the summary
shows `N passed, 0 failed`.

## Change the trial level

The level is plain data in `levels/trial.js`: its crews (job, leader, portrait, depot), phases
(length, max incidents at once, rain), the incident schedule (time, damage kind, road tile or
named building / streetlight / pump station), target, `warnScale`, drain/refill, right-crew
bonus and star scores. Job balance — speed, what each job is Best at or can help with, and its
advantage — is the table in `js/domain/jobs.js`. Edit and reload. If the level has a mistake, the console shows `[level] …` and
the map opens in free look instead. Format:
[specs/005-trial-level/contracts/level-definition.md](specs/005-trial-level/contracts/level-definition.md)
and [specs/006-crew-jobs/contracts/level-and-jobs.md](specs/006-crew-jobs/contracts/level-and-jobs.md).
A level for another map is a new `levels/<id>.js` with its own `<script>` tag after the maps.

## Add a map

Create `maps/<name>.js` that calls `MCW.maps.register({...})` with a text grid and an object
list, add a `<script>` tag for it in `index.html`, then open `index.html?map=<id>`.
Format: [specs/001-isometric-map-system/contracts/map-definition.md](specs/001-isometric-map-system/contracts/map-definition.md)
Or make it with the map decorator below.

## Map decorator (developers)

A developer tool for building sample maps from the tile set and sending them to the team.
Players never see it; the main menu is unchanged.

Open `index.html?edit=1`. The chooser lists your saved works, the registered maps
(*Decorate a copy*), a *New blank map* form (name, id, 5–100 × 5–100 tiles) and
*Import map file…*. Shortcuts: `index.html?edit=1&map=<id>` opens a copy of a registered
map, `index.html?edit=1&work=<id>` opens a saved work.

| Input | Action |
|---|---|
| Pick a ground piece, click / drag | Paint ground, roads, water, bridges (roads and shorelines join by themselves) |
| Pick a building or prop, click | Place it (green preview = allowed, red = outside the map or on another object) |
| Eraser (`E`), click / drag | Remove whole objects |
| Select, click an object | Info strip with *Show damaged* / *Show normal* |
| Right or middle drag | Scroll (left drag paints while a piece is picked) |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo (one drag = one step) |
| `Ctrl+S` | Save in this browser |
| `Esc` | Back to Select; in *Test play*, back to the editor |

**Send a map to a teammate**: click *Export* and *Download `<id>.js`*. The file has the same
format as the files in `maps/`. Your teammate either puts it in `maps/`, adds the
`<script>` line the export panel shows to `index.html` and opens `index.html?map=<id>`, or
opens it in their own decorator with *Import map file…*. Import reads the file as data only
and never runs it, so `maps/big.js` (which builds its grid with code) can't be imported, but
*Decorate a copy* works for it.

Saved works live in this browser only (`localStorage`). Firefox may block storage for pages
opened straight from disk; the editor then says it can't save, and *Export* still works.
Full details: [specs/004-map-decorator/contracts/editor-ui.md](specs/004-map-decorator/contracts/editor-ui.md)

## Project layout

Clean Architecture (constitution Principle VII) — dependencies point inward only:

- `js/domain/` — entities and rules: map, terrain, collision, coordinates, object types, road routes, incident kinds, crew jobs, level checks. No browser, no pictures.
- `js/application/` — game flow: camera, screen flow, game session (start view, pause/resume, menu drift), rain simulation, the trial level (round, crew, hints, level run), map decorator session (tools, undo/redo, save, export checks) and palette. Uses the domain only.
- `js/adapters/` — turns the game into pixels and back: tile/object/crew-vehicle art, renderer, developer overlay, rain drawing, level layer (truck, pins, arrows), input, menu screens, HUD (crew bar, incident panel), crew guide, decorator screens and overlay.
- `js/infrastructure/` — browser specifics: image loading, map and level registries, map file read/write, saved works (`localStorage`), file download/pick.
- `js/main.js` — composition root: creates the parts and wires them together, nothing else.
- `maps/` — map definitions
- `levels/` — level definitions (the trial level)
- `tests/` — unit tests by layer (`domain/`, `application/`, `adapters/`, `infrastructure/`) plus `architecture.test.js`, which fails if a layer reaches outward
- `Isometric City/` — art asset pack
- `specs/` — Spec Kit feature specs, plans and tasks
