# Implementation Plan: Map Decorator

**Branch**: `004-map-decorator` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-map-decorator/spec.md`

## Summary

This plan adds a developer-only **decorate mode**, opened with `index.html?edit=1`. A
developer can create a new blank map or decorate a copy of a registered one, paint ground and
roads, and place or erase buildings and props from the `Isometric City` pack, with undo/redo.
They can save drafts in the browser, test-play the layout, and **export a `maps/<id>.js` file**
in the existing map format to send to a teammate. The teammate drops the file in `maps/` (plus
one script tag) or imports it into their own decorate mode.

The rendering pipeline already re-picks road pieces and shorelines per tile, so editing
mostly reuses it. The new work is:

- small domain additions to `GameMap` (remove object, change events);
- a map serializer and shared map checks;
- an application `EditorSession` with undo history;
- a **literal-only reader** that imports map files without running them as code;
- `localStorage` drafts;
- an editor UI adapter.

Normal play and the main menu are untouched.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES2020, classic `<script>` files (no modules), unchanged

**Primary Dependencies**: None (no new libraries)

**Storage**: Browser `localStorage` for works in progress (`mcw.editor.*` keys, research R8); downloaded `.js` files for sharing

**Testing**: The existing in-browser harness `tests/index.html`. New suites: map-checks, map-serializer, palette, edit-history, editor-session, map-file. The architecture test is extended

**Target Platform**: Current desktop Chrome/Edge/Firefox, over `file://` and static hosting

**Project Type**: Browser game (single static front end) with an in-game developer tool

**Performance Goals**: 60 FPS while drag-painting on a 100×100 map; an edit is visible in the same frame (SC-002, SC-003). Normal-play load time is unchanged

**Constraints**:

- no build, install or server;
- import must never run code from a file;
- `maps/` and `index.html` are never written by the tool (browsers can't do it);
- the editor's extra images load only in decorate mode.

**Scale/Scope**: About 9 new source files, 6 changed files and 7 new or extended test files. The palette has 7 ground pieces and about 140 objects; maps go up to 100×100 tiles

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Always-Playable Build | The editor is behind the `?edit=1` flag; without it, boot is exactly as today (quickstart Q1–Q2, Q28). The work is split so each step leaves tests green and the game starting | ✅ |
| II. Core Loop First | The spec says it serves the map content the loop runs on, and it adds no gameplay rules. However, it is a **secondary system** started before the core loop (workers, incidents) exists | ⚠ Justified, see Complexity Tracking |
| III. Tested Logic, Playtested Presentation | All editing rules (painting, placement, erase, undo/redo, dirty state, reset, id rules, import validation, serialize round-trip) are in domain/application and unit-tested without the game page. The file reader is DOM-free and tested too. The UI is covered by the quickstart playtest checklist (Q1–Q28) | ✅ |
| IV. Performance Budget | Edits invalidate 9 tiles of the existing cache, and the renderer already culls. A stroke walks at most 4 samples per tile crossed. Extra images (about 300) load only in decorate mode, so the player load budget is unaffected. Checked by Q27–Q28 | ✅ |
| V. Simplicity | No libraries. Ports are plain objects like the existing `selectionPort`. No base classes. The reader supports only the literal subset our map files use. Test play reuses the live map instead of a second game | ✅ |
| VI. Browser-Only, Zero-Install | `localStorage`, `Blob` download and `FileReader` work over `file://` and static hosts with no server. Firefox `file://` storage may be blocked by its settings, which is handled with a message (research R8). Noted per Principle VI: on `file://` Firefox, saving works in progress may be unavailable, but export/import always work | ✅ (noted) |
| VII. Clean Architecture | Every new or changed file is assigned to a layer below. The domain and application layers get stores and files only through ports. `main.js` only wires things (a second wiring function for edit mode). The architecture test is extended to the new names | ✅ |

**Post-design re-check** (after research, data model and contracts): ✅ All gates still pass.
The one ⚠ (Principle II) is recorded in Complexity Tracking. No new violations came up: the
design adds no dependency from inner to outer layers, and the import path has no code
execution.

## Project Structure

### Documentation (this feature)

```text
specs/004-map-decorator/
├── plan.md                  # this file
├── research.md              # R1–R14
├── data-model.md            # GameMap changes, Change/History, EditorSession, Work, ports
├── quickstart.md            # unit tests + playtest checklist Q1–Q28
├── contracts/
│   ├── map-file.md          # export format, import grammar, import validation
│   ├── editor-ui.md         # URL settings, chooser, layout, mouse/keys, prompts
│   └── new-apis.md          # module interfaces by layer, script order, tests
├── checklists/requirements.md
└── tasks.md                 # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
index.html                         # CHANGED: + css/editor.css, + new script tags (order in contracts/new-apis.md)
css/
└── editor.css                     # NEW  adapters (style): plain developer styling
js/
├── domain/
│   ├── game-map.js                # CHANGED removeObject, place/remove events, setTerrain side effects, named
│   ├── map-checks.js              # NEW    bridge / object-on-water problems (moved from the parser)
│   ├── map-parser.js              # CHANGED uses mapChecks; output unchanged
│   └── map-serializer.js          # NEW    GameMap → Definition
├── application/
│   ├── palette.js                 # NEW    pieces, categories, search
│   ├── edit-history.js            # NEW    undo/redo stacks
│   └── editor-session.js          # NEW    tools, strokes, placement, erase, variant, save/reset/rename,
│                                  #        dirty state, problems, export info, test-play mode,
│                                  #        new-map + import validation helpers
├── adapters/
│   ├── art/terrain-art.js         # CHANGED + allImagePaths()
│   ├── input/input.js             # CHANGED + setTool(); ignore keys while typing
│   ├── render/editor-overlay.js   # NEW    brush, placement preview, eraser target
│   └── ui/editor-ui.js            # NEW    chooser, palette, top bar, info strip, export panel, prompts
├── infrastructure/
│   ├── map-file.js                # NEW    format() + literal-only read()
│   ├── work-store.js              # NEW    localStorage drafts (port)
│   └── file-io.js                 # NEW    download + pick file
└── main.js                        # CHANGED reads edit/work; startEditor() wiring; redraw on terrainchange
tests/
├── index.html                     # CHANGED loads the new domain/application files + map-file.js
├── architecture.test.js           # CHANGED new names per layer
├── domain/game-map.test.js        # CHANGED removeObject, events, setTerrain effects, named
├── domain/map-checks.test.js      # NEW
├── domain/map-serializer.test.js  # NEW  round trip vs parseMap
├── application/palette.test.js    # NEW
├── application/edit-history.test.js   # NEW
├── application/editor-session.test.js # NEW  strokes, placement, undo/redo, dirty, reset, ids, import checks
└── infrastructure/map-file.test.js    # NEW  format determinism, reading existing-style files, rejecting code
```

**Structure Decision**: this keeps the four-layer layout from `003` (Constitution VII). Every
new file goes in the layer its contents belong to: rules in domain, editing flow in
application, screen/DOM in adapters, and storage/files in infrastructure. `map-file.js` is
infrastructure because it handles the map definition file format, but it has no DOM, so the
test page can load it. Nothing goes in `maps/`. Map files are made by developers from the
exported output.

### Suggested build order (for `/speckit-tasks`)

1. **Domain**: `GameMap` additions, `mapChecks` (with the parser switched to it),
   `serializeMap`, with tests. The game is still unchanged.
2. **Story 1 (P1)**: `palette`, `edit-history`, and `EditorSession` painting with undo.
   `Input.setTool`, `allImagePaths`, `startEditor` with the chooser (registered maps + new blank
   map), the ground palette and brush overlay. Demo: paint roads and water on a new map.
3. **Story 2 (P2)**: placement check, place, erase, variant toggle, object palette sections,
   search, preview overlay.
4. **Story 3 (P3)**: `workStore`, save/dirty/leave prompt/beforeunload, saved works in the
   chooser, reset, rename/delete, test play, `mapFile.format` + export panel + `fileIO`
   download, then `mapFile.read` + import validation + import UI.

Each step ends with the test page green and `index.html` (normal play) still working.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle II: a secondary system (a developer tool) is built before the core loop is complete | The team asked for it so that several developers can build and share sample maps in parallel. Every later loop feature (routing, incidents, flooding) needs well-made test maps, and hand-editing 32×32 text grids is slow and error-prone | Keep hand-editing `maps/*.js` (it works, but it is slow and error-prone for roads and multi-tile buildings, and it doesn't scale to several people making maps). The risk stays contained: the tool is behind `?edit=1`, it changes no gameplay code paths, and it can be cut by deleting its files and script tags |
