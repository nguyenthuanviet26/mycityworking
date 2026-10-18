# Quickstart & Validation: Main Menu

## Run

- Open `index.html` (double-click). The loading bar appears, then the CaptAIn main menu.
- Unit tests: open `tests/index.html`. Expect all tests to pass, including the new
  `screens`, `attract` and `rain` suites.

## Playtest checklist

See [contracts/ui-screens.md](./contracts/ui-screens.md) for ids, content and keys.

| # | Steps | Expected | Spec |
|---|---|---|---|
| 1 | Open the game | Loading bar, then main menu with "CaptAIn", tagline, Play / How to Play / Credits; Play is focused | US1-1, FR-002 |
| 2 | Watch the background for 20 s | City visible but darkened, drifting slowly, never past the map edge; light rain falling | US1-2, FR-003, FR-003a |
| 3 | Try dragging, wheel and WASD on the menu | Map doesn't react | US1-5, FR-004 |
| 4 | Press ↓ ↓ ↑, then Enter | Focus moves visibly; Enter opens the focused item | US1-4, FR-012 |
| 5 | Click Play | Menu fades out in ≤ 0.5 s; the **trial level** starts (feature 005): HUD, phase rain, drag/zoom/select work; view starts at the level's start view, zoom 1×. With `?map=sample-city`: no rain, view at the map centre | US1-3, US1-6, FR-005 |
| 6 | Menu → How to Play | Summary and controls table; no dev keys | US2-1, US2-3 |
| 7 | Back button, then How to Play again and Esc | Main menu returns each time with How to Play focused | US2-2, FR-008 |
| 8 | While playing: move + zoom + select a tile, press Esc | Pause menu over dimmed map; map ignores input (in the trial level the storm rain keeps falling behind the pause menu; with `?map=sample-city` no rain) | US3-1 |
| 9 | Resume (and again with Esc) | Exactly the same view, zoom and selected tile | US3-2, SC-004 |
| 10 | Pause → How to Play → Back | Returns to the pause menu, not the main menu | US3-3 |
| 11 | Pause → Main Menu → Play | Title screen with drifting city and rain; Play starts at the default view | US3-4, US3-5 |
| 12 | Click the top-right pause button | Same as Esc | FR-009 |
| 13 | Menu → Credits | Team CaptAIn, the four members in order, event, asset-pack credit; Back/Esc returns with Credits focused | US4 |
| 14 | Mash Play / Esc quickly | Never two menus, never half-faded | Edge case |
| 15 | Press F3 on the menu, then on the map | Ignored on the menu; dev mode on the map | Edge case |
| 16 | Resize to 800×600 | All buttons and text visible; How to Play scrolls inside if needed | Edge case |
| 17 | `index.html?menu=0` | Goes straight to the trial level (feature 005) | FR-016 |
| 18 | `index.html?map=nope` | Error message; no menu | Edge case |
| 19 | Do the whole flow with keyboard only, then mouse only | Everything reachable | SC-003 |
| 20 | Watch the menu for 30 s on a mid-range laptop (optionally record with the browser's Performance tab) | Smooth drift and rain, no visible stutter (~60 FPS) | SC-006 |

## Playtest log

### 2026-10-17 — automated run (Chrome headless, `file://`)

Driven by scripted clicks and key events, plus a real-time Chrome DevTools session for
motion and frame timing. Steps marked **manual** need a person.

| # | Result | Evidence |
|---|---|---|
| 1 | ✅ | Menu after loading; title "CaptAIn" (tab title too); Play focused |
| 2 | ✅ | Real time: zoom 0.75, camera moved ~76 world px in 2 s, rain enabled and moving; screenshots show dimmed city + rain |
| 3 | ✅ | `input.enabled` false on the menu; the menu layer covers the canvas |
| 4 | ✅ | ↓ moves focus Play → How to Play; ↑↑ wraps to Credits |
| 5 | ✅ | Fade 300 ms (state busy during fade), then playing at zoom 1, map centre, no rain, input on |
| 6 | ✅ | Panel shows summary + 7 controls; no developer keys |
| 7 | ✅ | Back and Esc both return with How to Play focused |
| 8 | ✅ | Esc pauses; dim-light layer; input off; no rain; Resume focused |
| 9 | ✅ | Esc and Resume restore camera x/y/zoom exactly and the selected tile |
| 10 | ✅ | Pause → How to Play → Back returns to pause with How to Play focused |
| 11 | ✅ | Main Menu → drifting city + rain, selection cleared, Play focused; Play again starts at zoom 1 |
| 12 | ✅ | Top-right pause button pauses; hidden except while playing |
| 13 | ✅ | Credits: Team CaptAIn; Thuan Viet · Phuong Nghi · Thy Phuong · Dieu Le; Esc returns with Credits focused |
| 14 | ✅ | Play clicked twice + Esc during the fade: single transition, no half-faded state |
| 15 | ✅ | F3 ignored on the menu; works while playing |
| 16 | ✅ | 800×600 screenshot: whole menu visible (smaller title via media query) |
| 17 | ✅ | `?menu=0`: playing immediately, menu hidden, pause button shown |
| 18 | ✅ | `?map=nope`: error message, no menu |
| 19 | ✅ keyboard / ⏳ manual mouse | Keyboard path scripted end to end; real mouse hover/click feel still to check by hand |
| 20 | ✅ | Real-time headless Chrome: ~120 FPS on the menu with drift + rain |

Unit tests: 70 passed, 0 failed (Chrome and Edge).
