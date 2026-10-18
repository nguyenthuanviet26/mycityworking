# Implementation Plan: Main Menu

**Branch**: `002-main-menu` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-main-menu/spec.md`

## Summary

Add a CaptAIn title screen (Play / How to Play / Credits) shown after loading, with the city
drifting behind a dark layer under light rain, plus How to Play and Credits panels and an
in-game pause menu (Resume / How to Play / Main Menu) opened with Esc or a pause button.
Menus are HTML buttons over the existing canvas; screen flow is a small DOM-free state
machine; rain and the drifting camera are pure logic modules drawn by the existing renderer.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES2020, classic scripts (same as feature 001)

**Primary Dependencies**: None

**Storage**: N/A

**Testing**: Existing in-browser harness (`tests/index.html`) + quickstart playtest

**Target Platform**: Current desktop Chrome/Edge/Firefox, from `file://` and static hosting

**Project Type**: Browser game (single static front end)

**Performance Goals**: 60 FPS on the menu with drift + 160 rain streaks; menu actions respond in ≤ 0.5 s

**Constraints**: No install/build/backend; no per-frame allocation in rain; works over `file://`

**Scale/Scope**: 4 screens + 1 in-game button; ~3 new logic modules, 1 UI module, 1 render layer

**Depends on**: Feature 001 (map, camera, renderer, input, debug overlay)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Always-Playable Build | Play leads straight to the existing map; `?menu=0` keeps a direct path | ✅ |
| II. Core Loop First | Serves the loop's entry/exit; Settings, saves, level select explicitly deferred | ✅ |
| III. Tested Logic | Screen machine, attract path, rain simulation are DOM-free and unit-tested; UI has a playtest checklist | ✅ |
| IV. Performance | Rain uses a fixed pre-allocated pool and one stroke per frame; no DOM animation per drop | ✅ |
| V. Simplicity | Native HTML buttons + CSS; no UI library | ✅ |
| VI. Browser-Only, Zero-Install | HTML/CSS/JS only, classic scripts, no fonts or files from the network | ✅ |

**Post-design re-check**: ✅ All gates pass; no new dependencies, no build step.

## Project Structure

### Documentation (this feature)

```text
specs/002-main-menu/
├── plan.md
├── research.md          # R1–R10
├── data-model.md        # ScreenState, ScreenMachine, SavedView, Rain, Attract path
├── quickstart.md        # 20-step playtest
├── contracts/
│   └── ui-screens.md    # ids, content, keys, URL settings, script API
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

> Files moved by feature 003 — see `specs/003-clean-architecture-refactor/contracts/layer-map.md` for current locations.

```text
index.html               # MODIFY: remove stray "~", title "CaptAIn", #menu-layer markup, pause button, new scripts
css/
├── style.css            # unchanged
└── menu.css             # NEW: menu layer, cards, buttons, focus, fades, panels, pause button
js/
├── core/
│   ├── screens.js       # NEW: ScreenMachine (pure)
│   ├── attract.js       # NEW: drifting camera path (pure)
│   └── rain.js          # NEW: rain particle simulation (pure)
├── render/
│   └── rain-layer.js    # NEW: draws rain as a renderer top overlay
├── ui/
│   └── menu.js          # NEW: DOM wiring: show/hide screens, focus, keys, fades, pause button
├── input/input.js       # MODIFY: honour `enabled`; add `reset()` (clear keys/drag/hover)
├── render/debug-overlay.js # MODIFY: ignore keys while a menu is open
└── main.js              # MODIFY: create screens + menu, attract/rain in the loop, ?menu=0, saved view
tests/
├── index.html           # MODIFY: load new modules and tests
├── screens.test.js      # NEW
├── attract.test.js      # NEW
└── rain.test.js         # NEW
README.md                # MODIFY: mention the menu and ?menu=0
```

**Structure Decision**: Same single static project. New DOM code goes in a new `js/ui/` folder
to keep `js/core/` DOM-free.

## Complexity Tracking

No constitution violations.
