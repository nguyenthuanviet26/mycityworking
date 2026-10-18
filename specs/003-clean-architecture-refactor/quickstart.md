# Quickstart & Validation: Clean Architecture Refactor

## 1. Capture the baseline (before changing any code)

1. Open `tests/index.html` → record the summary (expected `70 passed, 0 failed`).
2. Take screenshots (same window size each time, e.g. 1600×1000):
   - `index.html` (menu — compared by eye, it animates)
   - `index.html?menu=0&zoom=0.5&center=16,16`
   - `index.html?menu=0&zoom=1&center=16,16`
   - `index.html?menu=0&zoom=2&center=16,16`
   - `index.html?map=big&menu=0&zoom=0.5`
3. Measure drawing time: open `index.html?map=big&menu=0&zoom=0.5`, then in the browser console:

   ```js
   (() => { const g = MCW.game; let s = 0; for (let i = 0; i < 120; i++) { g.camera.panBy(6, 2); const t = performance.now(); g.renderer.draw(); s += performance.now() - t; } return (s / 120).toFixed(2) + " ms"; })()
   ```

   Record the result (feature 001 measured 3.25 ms).

## 2. After the refactor

| # | Check | Expected | Spec |
|---|---|---|---|
| 1 | `tests/index.html` | All pre-existing 70 tests pass (same names) + new game-session, object-art and architecture tests; `0 failed` | FR-002, FR-016, SC-001 |
| 2 | Test page sources | Loads only `js/domain/*`, `js/application/*`, `js/adapters/art/*` + tests | FR-015, US3-1 |
| 3 | Architecture test | 0 violations; temporarily add `document.title` inside a domain function → the test fails; remove it again | FR-014, US3-3, SC-004 |
| 4 | Screenshots 2–5 from the baseline | Pixel-identical | SC-003 |
| 5 | Menu screenshot | Looks the same (title, buttons, dim city, rain) | SC-003 |
| 6 | Draw-time snippet | ≤ baseline + 10% (≤ 3.6 ms if the baseline is 3.25 ms) | FR-005, SC-006 |
| 7 | Feature 001 quickstart, steps 1–22 | Same results as its playtest log | FR-003 |
| 8 | Feature 002 quickstart, steps 1–20 | Same results as its playtest log | FR-003 |
| 9 | Console: `MCW.game.map.neighbors(10, 4, "vehicle")`, `MCW.game.map.collisionAt(-1, 0)`, `MCW.game.camera.centerOn(5.5, 5.5, {smooth: true})` | Same results as before | FR-004 |
| 10 | Open `index.html` from disk and from `?menu=0`, `?map=nope`, `?dev=1` | Same behaviour as before, no console errors | FR-001 |
| 11 | File layout | Every file under `js/` is in `domain/`, `application/`, `adapters/`, `infrastructure/` or is `main.js`; old folders gone | FR-006, SC-007 |
| 12 | `js/main.js` | ≤ 108 lines (30% shorter than 155); only settings, creation, wiring, loop | FR-013, SC-005 |
| 13 | Search domain + application for `document`, `canvas`, `.png`, `Image(` | No hits | FR-008, US2-2/3 |
