---

description: "Task list for the Main Menu feature"
---

# Tasks: Main Menu

**Input**: Design documents from `specs/002-main-menu/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-screens.md, quickstart.md

**Tests**: Included for the DOM-free logic (`js/core/screens.js`, `attract.js`, `rain.js`) as
required by Constitution III. UI is verified by the quickstart playtest.

**Organization**: Grouped by user story (US1–US4 from spec.md).

## Format: `[ID] [P?] [Story] Description`

## Conventions (apply to every task)

- Same rules as feature 001: classic scripts wrapped in `(function (MCW) { ... })(window.MCW);`,
  no modules, no `fetch`, no libraries; `js/core/*` never touches the DOM.
- Element ids, texts and key behaviour come from `contracts/ui-screens.md` — use them exactly.
- Fade duration: 300 ms. Buttons: at least 48 px tall. Focus outline: 3 px `#ffd54f`.

---

## Phase 1: Setup

- [X] T001 Update `index.html`: delete the stray `~` before `<!doctype html>`; set `<title>CaptAIn</title>`; add `<link rel="stylesheet" href="css/menu.css">` after `style.css`; add after `#devpanel` an empty `<div id="menu-layer" hidden></div>` and `<button id="btn-pause" class="pause-btn" aria-label="Pause" hidden>⏸</button>`; add script tags `js/core/screens.js`, `js/core/attract.js`, `js/core/rain.js` after `js/core/camera.js`, `js/render/rain-layer.js` after `js/render/debug-overlay.js`, and `js/ui/menu.js` after `js/input/input.js` (before `js/main.js`)
- [X] T002 [P] Create `css/menu.css`: `#menu-layer` fixed full-screen, flex-centred, background `rgba(10, 14, 22, 0.55)` (class `.dim-light` → `0.45` for the pause menu), `z-index` above the canvas and below `#overlay`; `.menu-card` with background `rgba(18, 22, 30, 0.88)`, text `#f2f4f8`, 12 px radius, padding 32px 40px, `max-width: min(520px, 92vw)`, `max-height: 90vh`, `overflow-y: auto`; `.menu-btn` block, width 100%, `min-height: 48px`, font 18px/600, background `#2b3445`, text `#f2f4f8`, hover `#3a465c`, `:focus-visible` outline `3px solid #ffd54f` with 2px offset, 10px vertical gap; `.title` 64px/800 with letter-spacing 2px and `.title .ai` in `#6cb4ee`; `.tagline` 16px `#c9d1dc`; `.pause-btn` fixed top-right 12px, 44×44, round, same colours; `.fade-out { opacity: 0; transition: opacity 300ms }` and `.fade-in` (opacity 1, same transition); `[hidden] { display: none !important }`
- [X] T003 [P] Update `tests/index.html`: load `../js/core/screens.js`, `../js/core/attract.js`, `../js/core/rain.js` after `camera.js`, and the test files `screens.test.js`, `attract.test.js`, `rain.test.js` after the existing tests (create each as an empty `describe` stub)

**Checkpoint**: Game still opens straight onto the map (menu layer hidden); test page loads with no errors.

---

## Phase 2: Foundational (blocks all stories)

- [X] T004 Write tests in `tests/screens.test.js` for every row of the transition table in data-model.md: starts in `loading`; `loaded` → `menu` with `focusOnShow` `btn-play`; `openHowto` from menu sets `returnTo` `menu` and `back` returns to `menu` with `focusOnShow` `btn-howto`; `openHowto` from `paused` and `back` returns to `paused` with `btn-pause-howto`; credits → back gives `btn-credits`; `pause`/`resume`; `back` on `paused` → `playing`; `toMenu` → `menu` with `btn-play`; invalid actions (e.g. `play` while `playing`, `pause` on `menu`) return `false` and don't change state; `escape()` maps per data-model.md; while `busy` is true every action returns `false`; a `change` event fires with `{from, to, action}`
- [X] T005 Implement `js/core/screens.js`: `MCW.ScreenMachine()` with `state`, `returnTo`, `focusOnShow`, `busy`, `on/off` (via `MCW.createEmitter`), `dispatch(action)` → boolean using the data-model.md transition table, `escape()`, and convenience methods `loaded()`, `play()`, `openHowto()`, `openCredits()`, `back()`, `pause()`, `resume()`, `toMenu()`; plus `inputEnabled()` → `state === "playing"`
- [X] T006 [P] Update `js/input/input.js`: return early from every pointer, wheel and keydown handler and from `update()` when `this.enabled` is false; add `reset()` that clears `held`, ends any drag (remove `grabbing` class) and clears the hover highlight (`_setHover(null)`)
- [X] T007 [P] Update `js/render/debug-overlay.js`: at the start of `_onKey`, return without handling if `this.game.menuOpen && this.game.menuOpen()` is true
- [X] T008 Create `js/ui/menu.js`: `MCW.MenuUI(game, layer)` that (a) maps states to screen ids (`menu`→`screen-menu`, `howto`→`screen-howto`, `credits`→`screen-credits`, `paused`→`screen-pause`, `playing`/`loading`→ none); (b) on machine `change`: shows the matching screen (`hidden` on the others), shows/hides `#menu-layer`, toggles `.dim-light` for `paused`, shows `#btn-pause` only in `playing`, focuses `machine.focusOnShow` (or the screen's first button); (c) runs a 300 ms fade when leaving `menu` for `playing` (set `machine.busy = true`, add `.fade-out`, after 300 ms hide the layer, remove the class, `busy = false`); (d) handles `keydown` on window: `Escape` → `machine.escape()`, `ArrowDown`/`ArrowUp` → move focus among the visible screen's `.menu-btn` buttons with wrap-around (only when a menu is shown); (e) `bind(id, fn)` helper that adds click handlers
- [X] T009 Update `js/main.js`: create `game.screens = new MCW.ScreenMachine()` and `game.menuOpen = function () { return game.screens.state !== "playing"; }`; create `game.menu = new MCW.MenuUI(game, document.getElementById("menu-layer"))` after input/debug; on screen `change` set `game.input.enabled = game.screens.inputEnabled()` and call `game.input.reset()` when it becomes false; after start call `screens.loaded()`, or — when `?menu=0` — `screens.loaded(); screens.play();` with no fade (FR-016); keep `?dev=1` working (turn dev mode on at the first switch to `playing`)

**Checkpoint**: Opening the game shows an empty dim layer (no screens yet) and the map ignores input; `?menu=0` goes straight to the playable map; all tests pass.

---

## Phase 3: User Story 1 - Start the game from a main menu (Priority: P1) 🎯 MVP

**Goal**: CaptAIn title screen with drifting city and rain; Play starts the map.

**Independent Test**: quickstart steps 1–5, 14, 17, 18.

### Tests for User Story 1

- [X] T010 [P] [US1] Write `tests/attract.test.js`: for a 32×32 map, `positionAt(t)` for 200 values of `t` from 0 to 180 000 ms stays within `[0.2·32, 0.8·32]` on both axes; `positionAt(0)` equals `positionAt(90000)` (period 90 000 ms) within 1e-9; consecutive positions 16 ms apart differ by less than 0.02 tiles (slow drift; the 90 s loop moves ~0.011 tiles per frame on a 32×32 map); `MCW.attract.ZOOM === 0.75`
- [X] T011 [P] [US1] Write `tests/rain.test.js`: `create(160, 800, 600, 42)` has `count` 160 and `Float32Array` fields of length 160; two rains created with the same seed are identical; after `update(rain, 16)` every streak moved down by `speed·0.016` (or respawned); after many updates (e.g. 500 × 16 ms) every `y` is ≤ 600 + 22 and the count is still 160; speeds are within 700–1100 and lengths within 10–22; `resize(rain, 400, 300)` keeps every `x` within `[−30, 460]`

### Implementation for User Story 1

- [X] T012 [P] [US1] Implement `js/core/attract.js`: `MCW.attract = { ZOOM: 0.75, PERIOD_MS: 90000, positionAt(tMs, cols, rows) }` returning `{x: cols/2 + 0.22·cols·cos(2π·t/PERIOD), y: rows/2 + 0.22·rows·sin(2π·t/PERIOD)}`
- [X] T013 [P] [US1] Implement `js/core/rain.js` per data-model.md: `MCW.rain = { create(count=160, width, height, seed=1), update(rain, dtMs), resize(rain, width, height) }`; fields `x`, `y`, `speed` ("700–1100 px/s"), `len` ("10–22 px") as `Float32Array(count)`, `wind = −0.25`; respawn rule "a streak with `y − len > height` or `x < −30` respawns at `y = −len − random·40` and a random `x` in `[0, width + 60]`"; seeded LCG stored on the object; no allocation in `update`
- [X] T014 [US1] Implement `js/render/rain-layer.js`: `MCW.RainLayer(game)` holding a rain created at the window size; `enabled` flag; `update(dtMs)` (only when enabled) returns true; registers a renderer `topOverlays` function that, when enabled, draws all streaks as one path of 1 px lines from `(x, y)` to `(x + wind·len, y + len)` in `rgba(200, 222, 255, 0.5)` using screen coordinates (renderer already set the DPR transform); `resize(w, h)` forwards to `MCW.rain.resize`
- [X] T015 [US1] Add the main menu markup inside `#menu-layer` in `index.html`: `<section id="screen-menu" class="menu-card" hidden>` with `<h1 class="title">Capt<span class="ai">AI</span>n</h1>`, `<p class="tagline">Keep the city running through the rainy season</p>`, and buttons `btn-play` "Play", `btn-howto` "How to Play", `btn-credits` "Credits" (class `menu-btn`, `type="button"`)
- [X] T016 [US1] Wire Play in `js/ui/menu.js`: `btn-play` → `machine.play()`; while fading the layer must not accept clicks (`pointer-events: none` during `.fade-out`)
- [X] T017 [US1] Update `js/main.js` loop and screen changes: create `game.rain = new MCW.RainLayer(game)` and forward window resize to it; while state is `menu`, `credits`, or `howto` with `returnTo === "menu"`: enable rain, set camera zoom to `MCW.attract.ZOOM` and `camera.centerOn(attract.positionAt(elapsed, cols, rows))` every frame, request a redraw; otherwise disable rain; when the state changes to `playing` from `menu`, set zoom 1 and centre on `(cols/2, rows/2)` (the map's default view, FR-005/FR-011) before the fade finishes
- [X] T018 [US1] Run quickstart steps 1–5, 14, 17, 18 and append the results to a "Playtest log" section in `specs/002-main-menu/quickstart.md`

**Checkpoint**: MVP — CaptAIn menu with rain and drifting city; Play enters the map.

---

## Phase 4: User Story 2 - Learn the controls before playing (Priority: P2)

**Goal**: How to Play panel reachable from the main menu.

**Independent Test**: quickstart steps 6–7.

- [X] T019 [US2] Add `<section id="screen-howto" class="menu-card" hidden>` to `index.html` with heading "How to Play", the summary paragraph and the controls table exactly as in contracts/ui-screens.md (no developer keys), and button `btn-howto-back` "Back"; style the table in `css/menu.css` (full width, 8px cell padding, light row separators, key column in `#ffd54f`)
- [X] T020 [US2] Wire in `js/ui/menu.js`: `btn-howto` → `machine.openHowto()`, `btn-howto-back` → `machine.back()` (Escape already routes through `machine.escape()`)
- [X] T021 [US2] Run quickstart steps 6–7 and append results to the playtest log in `specs/002-main-menu/quickstart.md`

---

## Phase 5: User Story 3 - Pause during play and return to the menu (Priority: P3)

**Goal**: Esc / pause button opens Resume, How to Play, Main Menu; Resume restores the view.

**Independent Test**: quickstart steps 8–12.

- [X] T022 [US3] Add `<section id="screen-pause" class="menu-card" hidden>` to `index.html` with heading "Paused" and buttons `btn-resume` "Resume", `btn-pause-howto` "How to Play", `btn-to-menu` "Main Menu"
- [X] T023 [US3] Wire in `js/ui/menu.js`: `btn-pause` → `machine.pause()`, `btn-resume` → `machine.resume()`, `btn-pause-howto` → `machine.openHowto()`, `btn-to-menu` → `machine.toMenu()`; make sure Escape while `playing` pauses and while `paused` resumes (via `machine.escape()`)
- [X] T024 [US3] Add the SavedView in `js/main.js` per data-model.md: on `playing → paused` store `{wx, wy, zoom, hovered, selected}` from the camera/input; on `paused → playing` (resume or back) write them back (`camera.wx/wy/zoom`, `input.select(selected)`, renderer `hovered`) and `requestRedraw()`; on `toMenu` discard it and clear the selection (`input.select(null)`), then restart the attract drift from elapsed time 0
- [X] T025 [US3] Run quickstart steps 8–12 and append results to the playtest log in `specs/002-main-menu/quickstart.md`

---

## Phase 6: User Story 4 - See who made the game (Priority: P4)

**Goal**: Credits panel.

**Independent Test**: quickstart step 13.

- [X] T026 [US4] Add `<section id="screen-credits" class="menu-card" hidden>` to `index.html` with heading "Credits", "Team CaptAIn", the members "Thuan Viet · Phuong Nghi · Thy Phuong · Dieu Le" (in that order), "Made for Hackathon HK1 2026–27", "Art: \"Isometric City\" asset pack", and button `btn-credits-back` "Back"
- [X] T027 [US4] Wire in `js/ui/menu.js`: `btn-credits` → `machine.openCredits()`, `btn-credits-back` → `machine.back()`
- [X] T028 [US4] Run quickstart step 13 and append results to the playtest log in `specs/002-main-menu/quickstart.md`

---

## Phase 7: Polish & Cross-Cutting

- [X] T029 Check the layout at 800×600 (quickstart step 16): all buttons visible; the How to Play card scrolls inside itself (`max-height: 90vh; overflow-y: auto` from T002); adjust `css/menu.css` (e.g. smaller title under `@media (max-height: 640px)`) if anything is cut off
- [X] T030 [P] Update `README.md`: the game opens on the CaptAIn menu; Esc pauses; `?menu=0` skips the menu
- [X] T031 Run `tests/index.html` (all suites pass), the full quickstart (steps 1–20) including keyboard-only and mouse-only runs (step 19) and the F3 check (step 15), and confirm no console errors from `file://`; update the playtest log

---

## Dependencies & Execution Order

- Setup → Foundational → US1 → (US2, US3, US4 in any order) → Polish.
- US2, US3 and US4 each only add a screen + wiring and depend on Foundational and on the menu
  existing (US1's markup gives them a way to be reached; US3 is reachable via `?menu=0` even
  without US1).
- Within stories: tests (T010, T011) before T012/T013; markup before wiring; playtest last.
- Same-file rule: tasks editing `index.html` (T001, T015, T019, T022, T026), `js/ui/menu.js`
  (T008, T016, T020, T023, T027) or `js/main.js` (T009, T017, T024) run one after another.

### Parallel Opportunities

- T002 and T003 after T001.
- T006 and T007 alongside T004/T005.
- T010, T011, T012, T013 together (four different files).
- T030 at any time after US1.

## Parallel Example: User Story 1

```text
Task: "T010 attract tests in tests/attract.test.js"
Task: "T011 rain tests in tests/rain.test.js"
Task: "T012 js/core/attract.js"
Task: "T013 js/core/rain.js"
```

## Implementation Strategy

1. Setup + Foundational → menu plumbing in place, game still playable with `?menu=0`.
2. US1 → **stop and validate**: CaptAIn menu with rain, Play works (MVP).
3. US2 → How to Play. 4. US3 → pause menu. 5. US4 → Credits. 6. Polish.

Each step keeps the game playable (Constitution I).

## Notes

- 31 tasks. [P] = different files, no unfinished dependencies.
- Constitution III: new logic modules ship with tests; UI ships with the playtest log.

## Implementation status (2026-10-17)

- All 31 tasks done. Unit tests: 70 passed, 0 failed (Chrome and Edge, `file://`).
- T031 note: the full flow was verified with scripted clicks and keys plus a real-time Chrome
  session; real-mouse hover and click feel (quickstart step 19, mouse half) is still worth a
  quick manual check.
- Tuned during implementation (design docs updated to match): drift radius 0.3 → 0.22 of
  the map size (kept the view over the city), rain colour `rgba(200, 222, 255, 0.5)` (0.35 was
  hard to see), attract test threshold 0.02 tiles/frame.
