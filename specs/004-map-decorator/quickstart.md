# Quickstart: Map Decorator: validation guide

This is the feature's playtest checklist (Constitution III), plus the unit-test check. No
install or build is needed. Open the files in a current Chrome/Edge or Firefox, either straight
from disk or from any static file server.

The contracts give the exact behaviour: `contracts/editor-ui.md` (controls, prompts) and
`contracts/map-file.md` (file format, import errors).

## 0. Unit tests

Open `tests/index.html`. **Expected**: the summary says `N passed, 0 failed`. The list includes
the map-checks, map-serializer, palette, edit-history, editor-session and map-file suites, and
`architecture` passes.

## 1. Normal play is unchanged (Principle I)

| # | Steps | Expected |
|---|---|---|
| Q1 | Open `index.html` | Main menu with rain, exactly as `002`; no editor anywhere |
| Q2 | Play, scroll, zoom, Esc → pause → Main Menu | as before; no console errors |

## 2. Opening decorate mode

| # | Steps | Expected |
|---|---|---|
| Q3 | Open `index.html?edit=1` | The chooser lists *Saved works* (empty the first time), *Registered maps* (Sample City, Tiny, Big), *New blank map*, *Import map file…* and *Back to the game* |
| Q4 | New blank map: name `Test Town`, size 20×20 → Create | The editor opens on a 20×20 all-grass map; the id is suggested as `test-town`; the top bar says unsaved |
| Q5 | Open `index.html?edit=1&map=sample-city` | The editor opens straight on a copy of Sample City, with no menu |
| Q6 | New blank map with id `Bad Id` or size 4×200 | *Create* is disabled and the reason is shown by the field |

## 3. Painting (User Story 1)

| # | Steps | Expected |
|---|---|---|
| Q7 | Pick *road*; drag fast in a loop of about 12 tiles on the blank map | Every crossed tile becomes road, with no gaps; corners, T-junctions and ends join correctly (SC-004) |
| Q8 | Pick *water*; paint a 3×3 pond next to grass and dirt | Shoreline edges and corners appear on every side |
| Q9 | Press F3, then C (collision overlay) | Road shows green, grass yellow, water red; this updates immediately while painting |
| Q10 | On Sample City, paint *concrete* on a tile under the hospital | The ground changes; the hospital stays and still blocks movement |

## 4. Objects (User Story 2)

| # | Steps | Expected |
|---|---|---|
| Q11 | Search `hosp`; pick *hospital a*; hover the map | Only matching pieces are listed; a see-through hospital covers 2×2 diamonds, green on free tiles and red over another object or the edge, where clicking does nothing (SC-007) |
| Q12 | Place a hospital, a 1×1 house and a tree; pick Eraser and click one tile of the hospital | All three are placed in correct depth order; the whole hospital is removed |
| Q13 | Select tool → click a house → *Show damaged* | The house switches to its damaged picture without moving |

## 5. Undo, save, test play, leave (User Story 3)

| # | Steps | Expected |
|---|---|---|
| Q14 | Make 10 changes; Ctrl+Z ×5, Ctrl+Y ×2 | The map matches each step; one drag stroke undoes as one step |
| Q15 | Ctrl+S; reload the page; open `?edit=1` | *Test Town* is listed under Saved works and opens exactly as saved. In Firefox from disk, if storage is blocked, the save message from `editor-ui.md` appears instead (research R8) |
| Q16 | Change something; click *Test play*; scroll and click; press Esc | Normal play on the edited layout (unsaved changes included); Esc returns to the editor with the history intact |
| Q17 | Change something; *Leave* → Cancel, then Leave → Discard | Cancel keeps you in the editor; Discard returns to the chooser and the work is as last saved |
| Q18 | Change something; close the tab | The browser's leave-page warning appears |
| Q19 | *Reset* → confirm, then Ctrl+Z | It returns to the starting layout; undo brings the edits back |

## 6. Export and send (User Story 3, SC-006, SC-008, SC-009)

| # | Steps | Expected |
|---|---|---|
| Q20 | In *Test Town*, place a bridge on land; click *Export* | The panel lists the bridge warning, shows the 3 steps and `<script src="maps/test-town.js"></script>`, and downloads `test-town.js` |
| Q21 | Open `test-town.js` in a text editor | It matches the style of `maps/sample-city.js`: header comment, terrain grid, one object per line |
| Q22 | Copy it into `maps/`, add the script line to `index.html`, open `index.html?map=test-town&menu=0` | It plays with the same layout and collision (then revert `index.html` and remove the file) |
| Q23 | In a different browser (or after clearing site data), `?edit=1` → Import → `test-town.js` | It opens as a saved work with the same layout; save and export work again |
| Q24 | Import `maps/sample-city.js` without editing; Export | The downloaded file has the same layout as the original; a text compare shows only the header comment and formatting differences; nothing in `maps/` has changed |
| Q25 | Import a file containing `MCW.maps.register(alert(1))`, a `.txt` file of random text, and a map using `"spaceship_a"` | Each is rejected with the matching message from `map-file.md`; no alert runs; nothing is created |
| Q26 | Export a new map whose id is `tiny` | A clash warning appears with the suggestion `tiny-2` |

## 7. Performance (Principle IV, SC-002, SC-003)

| # | Steps | Expected |
|---|---|---|
| Q27 | `?edit=1&map=big&dev=1`; drag-paint road across the map at 0.5× zoom | The FPS readout stays around 60; painted tiles appear in the same frame |
| Q28 | Open `index.html` (normal play) | Load time and FPS as before; the editor's extra images aren't loaded |

## Gate review (2026-10-17, `/speckit-implement`)

Run headlessly in Chrome through the DevTools protocol (scripted clicks, drags, keys, file
picks and downloads), plus the unit-test page.

| Gate (constitution) | Result |
|---|---|
| 1. No console errors | None in normal play, the chooser, the editor (all three stories), test play or import of bad files |
| 2. Unit tests | `tests/index.html`: **169 passed, 0 failed** (85 before this feature), including `architecture` |
| 3. Playtest checklist | Q1–Q28 pass. Q22 was run with a temporary copy of `index.html` plus the exported file, both removed afterwards |
| 4. Core loop still playable | Menu → Play → scroll/zoom/select → Esc pause → Main Menu works as before |
| 5. Frame rate | Drag-painting road across `big` at 0.5×: avg 16.9 ms, p95 16.8 ms per frame (same as panning normal play: 16.7 / 16.7). With `&dev=1`, normal play and the editor both show some 33 ms frames because developer mode redraws every frame. That was already true before this feature |
| 6. No install/build/backend | Still plain classic scripts; no new libraries; `localStorage`, `Blob` download and `FileReader` only |
| 7. Layers and composition root | New files sit in the layers listed in `plan.md`. The editor UI receives storage, files and the map file format through `io` from `js/main.js`. `main.js` only wires things together (a second wiring path for `?edit=1` and a shared frame loop) |

Notes:

- Normal play loads 122 images for the sample city. Decorate mode loads 326 (every terrain piece and object), only when `?edit=1` is used.
- `maps/big.js` builds its grid with code, so *Import* rejects it by design (`contracts/map-file.md`). *Decorate a copy* opens it.
- Firefox `file://` storage was not tested headlessly. If storage is blocked, the save message appears and Export still works (research R8).
