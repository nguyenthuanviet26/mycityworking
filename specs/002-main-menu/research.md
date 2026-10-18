# Phase 0 Research: Main Menu

No open unknowns came out of the spec (title, rain and credits were clarified). Decisions below.

## R1. How menus are built

- **Decision**: Menus and panels are plain HTML elements (`<section>`, `<h1>`, `<button>`) in
  `index.html`, styled with CSS and layered over the game canvas. The city and the rain stay on
  the canvas.
- **Rationale**: Real `<button>`s give focus, Tab order, Enter/Space activation and screen-reader
  labels for free (FR-012); text stays sharp at any size; CSS transitions handle the fades
  (FR-005). Constitution VI: HTML/CSS/JS only, no library needed.
- **Alternatives considered**: Drawing menus on the canvas (must re-implement focus, hit
  testing and text layout); a UI library (unnecessary dependency).

## R2. Screen flow as a pure state machine

- **Decision**: `js/core/screens.js` holds a DOM-free state machine with states `loading`,
  `menu`, `howto`, `credits`, `playing`, `paused`, and actions `loaded`, `play`, `openHowto`,
  `openCredits`, `back`, `pause`, `resume`, `toMenu`. It remembers which screen opened a panel
  (for Back, FR-008) and which button to focus on return. Invalid actions are ignored, which
  makes rapid clicks and repeated Escape harmless (edge case).
- A `busy` flag is set during a fade (300 ms); actions arriving while busy are dropped.
- **Rationale**: Constitution III (logic testable without DOM); one place decides what Escape
  means on every screen.

## R3. Blocking map input while a menu is open

- **Decision**: `MCW.Input` gets an `enabled` flag checked at the top of every handler
  (pointer, wheel, keys, keyboard scroll in `update`). The debug overlay checks a
  `game.menuOpen()` function before handling keys. Opening a menu also clears held keys and
  any drag. The menu layer is a full-screen element above the canvas, so pointer events never
  reach the canvas anyway; the flag covers keyboard input.
- **Rationale**: FR-004 and the "developer mode ignored while a menu is open" edge case.

## R4. Drifting city behind the main menu ("attract mode")

- **Decision**: While the main menu is open, the camera follows a slow ellipse around the map
  centre: `x = cx + rx·cos(t·ω)`, `y = cy + ry·sin(t·ω)` in map coordinates, with
  `rx = 0.22·cols`, `ry = 0.22·rows` and one loop every 90 s, at zoom 0.75. Positions are passed
  through `camera.centerOn`, so they are always clamped to the bounds (FR-003). Pure function
  `MCW.attract.positionAt(tMs, cols, rows)` in `js/core/attract.js`.
- On Play the camera jumps to the map's default view (centre, zoom 1) before the fade ends
  (FR-005, FR-011).
- **Rationale**: Smooth, endless and predictable; one formula, easy to unit-test.
- **Alternatives considered**: Random waypoints with glides (jerky stops); a fixed still view
  (the spec asks for motion).

## R5. Rain effect

- **Decision**: A fixed pool of 160 rain streaks (pre-allocated arrays, no per-frame
  allocation — Constitution IV). Each streak has screen position, speed (700–1100 px/s) and
  length (10–22 px), falls at a slight slant (wind −0.25), and re-enters from the top when it
  leaves the screen. Drawn as 1 px lines in `rgba(200, 222, 255, 0.5)` in a single batched
  path. Logic in `js/core/rain.js` (pure: `create(count, w, h, seed)`, `update(rain, dtMs)`,
  `resize`); drawing in `js/render/rain-layer.js` as a renderer top overlay, so it sits above
  the city and below the HTML menu (FR-003a).
- The layer is enabled only in the `menu`, `howto` (opened from menu) and `credits` states.
- **Rationale**: One path + one stroke per frame is cheap; seeded randomness makes tests
  deterministic; screen-space rain doesn't depend on zoom.
- **Alternatives considered**: CSS-animated rain elements (hundreds of DOM nodes, worse
  performance); rain image sprites (no rain art in the pack).

## R6. Darkening the background

- **Decision**: The menu layer has a background of `rgba(10, 14, 22, 0.55)` over the canvas;
  the menu card itself is `rgba(18, 22, 30, 0.88)` with `#f2f4f8` text (contrast ≈ 15:1,
  FR-013). Pause menu uses the same card over a lighter dim (0.45).

## R7. Keyboard and focus

- **Decision**: Each screen has an ordered list of buttons. On showing a screen, focus goes to
  its default button (Play / Resume / Back) or the button recorded by the state machine.
  ArrowUp/ArrowDown move focus within the list (wrapping); Tab follows the DOM order; Enter
  and Space are handled natively by `<button>`. Escape is routed through the state machine
  (`back` on panels, `resume` on pause, `pause` while playing, nothing on the main menu).
  Focus is shown with a 3 px `#ffd54f` outline (`:focus-visible`) and hover with a lighter
  background. Buttons are 48 px tall (FR-013: ≥ 44 px).

## R8. Pausing and restoring the view

- **Decision**: Pause stores `{wx, wy, zoom, hovered, selected}`; Resume writes them back and
  requests a redraw (FR-010, SC-004). The camera is never moved while paused, so the restore
  is exact; storing it protects against future features moving the camera (e.g. resize).
- The pause button is a 44×44 px `<button aria-label="Pause">` in the top-right corner, shown
  only while playing.

## R9. Startup and URL settings

- **Decision**: After assets load, the state goes `loading → menu`. `?menu=0` sends `loaded`
  then `play` immediately (FR-016) without fades. `?map=` and `?dev=1` keep working; the map
  chosen is the one Play starts. If the map fails to load, the existing error overlay is
  shown and the menu never appears.
- `<title>` becomes "CaptAIn"; the stray `~` before `<!doctype html>` in `index.html` is
  removed (it puts the page into quirks mode).

## R10. Testing

- **Decision**: New unit tests on the existing in-browser test page: `screens.test.js`
  (every transition, Back targets, focus targets, busy flag, ignored actions),
  `attract.test.js` (positions stay inside the map, loop period), `rain.test.js` (count
  stays constant, streaks wrap to the top, deterministic with a seed, resize keeps streaks on
  screen). Menus, fades, focus visuals and rain look are covered by the quickstart playtest.
