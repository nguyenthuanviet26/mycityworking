# Feature Specification: Clean Architecture Refactor

**Feature Branch**: `003-clean-architecture-refactor`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Refactor the code into clean architecture layers (domain, application, adapters, infrastructure) per constitution Principle VII, with no change in behaviour; all 70 tests and both playtest checklists must still pass."

## Overview

Constitution v2.1.0 added Principle VII (Clean Architecture). The game written so far (the
isometric map, feature 001, and the main menu, feature 002) predates that rule. This feature
reorganises the existing code into the four required layers **without changing anything a
player can see or do**.

The people who benefit are the **development team**: game rules become testable and changeable
on their own, art and menus can change without touching the rules, and teammates can work in
different layers without stepping on each other. Players and judges should notice nothing.

**Core loop served** (Constitution Principle II): none directly — this is enabling work so the
next core-loop features (workers, routing, incidents) can be built on a clean base. It is done
now because the codebase is still small (~2,000 lines); the cost grows with every feature.

**Known violations to fix** (from the constitution's Sync Impact Report and a code survey):

1. The map's rules (tiles, objects, collision) know about image file paths: the map asks the
   art-matching code for pictures and stores them, and the object list mixes rules (size,
   blocks movement) with picture files.
2. The startup file contains game flow (pausing and restoring the view, the drifting menu
   background, choosing the start view) instead of only wiring parts together.
3. The camera, screen flow, drifting path and rain are mixed in with the map's rules in one
   folder, with no visible layer boundaries.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The game behaves exactly as before (Priority: P1)

A player (or judge) opens the game after the refactor. The CaptAIn menu appears with the
drifting city and rain; Play, How to Play, Credits, pause, resume and every map control work
exactly as they did, with the same look and speed. Nothing new appears and nothing is missing.

**Why this priority**: A refactor that changes behaviour is a regression. Keeping the game
identical is the non-negotiable part of this feature (Constitution Principle I).

**Independent Test**: Run every existing automated test and both existing playtest checklists
(feature 001: 22 steps, feature 002: 20 steps) against the refactored game; compare
screenshots of the menu and of the map at fixed views before and after.

**Acceptance Scenarios**:

1. **Given** the refactored game, **When** the full automated test page is run, **Then** all tests that existed before (70) pass, with the same names and the same checks.
2. **Given** the refactored game, **When** the feature 001 and feature 002 playtest checklists are run, **Then** every step that passed before still passes.
3. **Given** the same map and view settings, **When** screenshots of the menu and of the map (at 0.5×, 1× and 2× zoom) are taken before and after, **Then** they are visually identical (rain and drift excluded, since they are animated).
4. **Given** the big 100×100 map, **When** drawing time is measured as before, **Then** it is no more than 10% slower than the measured baseline (3.25 ms average at 0.5×).
5. **Given** the game opened directly from disk, **When** it starts, **Then** it works with no console errors, exactly as before.

---

### User Story 2 - Each part of the code lives in its proper layer (Priority: P2)

A developer opens the code and finds four clearly named layers — domain, application,
adapters, infrastructure — plus one startup file that only wires them together. Every file
belongs to exactly one layer, and no file reaches "outward" to a layer it is not allowed to use.

**Why this priority**: This is the actual goal of the refactor, but only valuable once Story 1
guarantees nothing broke.

**Independent Test**: List every source file with its layer; run an automated check that scans
each layer's files for forbidden references (browser objects, picture paths, or outer layers);
read the startup file and confirm it contains no rules or game flow.

**Acceptance Scenarios**:

1. **Given** the refactored code, **When** files are listed, **Then** every game source file is in exactly one of the four layer folders, except the single startup file.
2. **Given** the domain layer, **When** it is scanned, **Then** it contains no references to the browser page, drawing surface, images, timers, or picture file paths, and none to the other three layers.
3. **Given** the application layer, **When** it is scanned, **Then** it references only itself and the domain, and contains no browser page, drawing, or picture-path references.
4. **Given** the map's rules, **When** a developer asks "which picture does this tile use?", **Then** that question is answered entirely outside the domain, from plain data the domain provides (terrain, neighbours, variant).
5. **Given** the startup file, **When** it is read, **Then** it only creates the parts and connects them; pausing/resuming, the drifting background and choosing the start view live in the application layer.

---

### User Story 3 - Rules and flow are tested without the game page (Priority: P3)

A developer runs the test page and sees the domain and application tests run on their own,
without the game page, the renderer or any picture being loaded. The flow that moved out of the
startup file (pause/resume with view restore, drifting background control, start view) now has
its own automated tests.

**Why this priority**: Makes the layering pay off immediately and protects it from future
regressions, but the game already works without it.

**Independent Test**: Open the test page and confirm (from what it loads) that no rendering,
input, menu or image code is included; confirm new tests exist and pass for the flow moved out
of the startup file and for the layer-boundary check.

**Acceptance Scenarios**:

1. **Given** the test page, **When** it loads, **Then** it loads only domain and application code (plus the test harness and test files) — no rendering, input, menu, image or map-file code.
2. **Given** the moved game flow, **When** tests run, **Then** there are passing tests for: saving the view on pause and restoring it exactly on resume; discarding it when returning to the main menu; the background drifting only on the main menu, its panels opened from it, and Credits; and Play starting from the default view.
3. **Given** the layer-boundary check, **When** it runs, **Then** it reports zero violations, and it fails if a forbidden reference is deliberately added to a domain file.

---

### Edge Cases

- **Tests that reached across layers**: a few existing tests check picture choices through the map (e.g. "a damaged road uses damaged art"). They keep checking the same behaviour, but move to the adapter tests and ask the art-matching code instead of the map. Their number and meaning must not shrink.
- **Map files**: the hand-written map definitions (sample city, tiny, big) keep their exact format and content; only where they are loaded from may change.
- **Developer tools**: developer mode, URL settings (`?map=`, `?menu=0`, `?zoom=`, `?center=`, `?dev=1`) and the console commands documented in feature 001 (`MCW.game.map.neighbors(...)`, `collisionAt`, `camera.centerOn`) keep working with the same names.
- **Opening from disk**: the new folder layout must still load in the right order when `index.html` is opened directly from disk.
- **Damaged variants**: buildings without damaged art still refuse to switch to damaged, even though that knowledge (which pictures exist) now lives outside the domain.

## Requirements *(mandatory)*

### Functional Requirements

**No behaviour change**

- **FR-001**: Everything a player can see or do MUST be unchanged: screens, text, controls, keyboard behaviour, map appearance, menu look, rain, drift, timing of fades, URL settings and error messages.
- **FR-002**: All 70 existing automated tests MUST still pass. Tests may move between test files or be pointed at the new home of the same behaviour, but no test may be deleted or weakened.
- **FR-003**: Both existing playtest checklists (features 001 and 002) MUST pass in full after the refactor.
- **FR-004**: The public developer console interface documented in feature 001's map API (map queries, collision overrides, camera, drawables, selection events) MUST keep the same names and behaviour.
- **FR-005**: Drawing performance on the 100×100 map MUST stay within 10% of the measured baseline.

**Layers (Constitution Principle VII)**

- **FR-006**: The code MUST be organised into the four layers — domain, application, adapters, infrastructure — each in its own folder, plus one startup file (composition root).
- **FR-007**: The domain layer MUST contain the map and its tiles, terrain types and their collision rules, collision combining, coordinates and directions, map objects with their size and movement rules, and map-definition parsing into a map.
- **FR-008**: The domain MUST NOT know any picture file names or paths. Object types keep their rules (kind, footprint size, collision) in the domain; their pictures (normal and damaged) move to an adapter. Whether an object *can* be shown as damaged MUST be expressed in the domain as plain data (a "has a damaged look" flag), so the existing rule "only switch to damaged when damaged art exists" keeps working.
- **FR-009**: The map MUST NOT store or compute pictures. Choosing the picture for each tile (road pieces, shorelines, bridges, variants) MUST happen in an adapter, using only data the map exposes. Any caching of chosen pictures also lives in the adapter and is refreshed when the map reports a change.
- **FR-010**: The application layer MUST contain the screen flow, the camera, the drifting-background path, the rain simulation, and the game-session flow moved out of the startup file: choosing the start view, saving/restoring the view on pause/resume, discarding it on return to the menu, and deciding when the background drifts and rain shows.
- **FR-011**: The adapters layer MUST contain rendering, art matching, the object picture list, the developer overlay, the rain drawing, input handling and the menu screens.
- **FR-012**: The infrastructure layer MUST contain image loading, the map registry and the map definition files' loading.
- **FR-013**: The startup file MUST only read settings, create the parts, connect them and start the frame loop; it MUST NOT contain game rules or flow decisions.
- **FR-014**: Dependencies MUST point inward only, as defined in Principle VII, and an automated check on the test page MUST verify it by scanning the source of each layer for forbidden references.

**Tests**

- **FR-015**: The test page MUST load only domain and application code plus tests; adapter tests that need no browser page (e.g. art matching) MAY also be loaded, but nothing that draws, loads images or touches the page.
- **FR-016**: New automated tests MUST cover the game-session flow moved out of the startup file (FR-010) and the layer-boundary check (FR-014).

**Documentation**

- **FR-017**: The README and the feature 001/002 plans' file lists MUST be updated (or annotated) to show the new file locations, so the documents match the code.

### Key Entities

- **Layer**: one of domain, application, adapters, infrastructure; has a folder and a list of layers it may depend on.
- **Object type rules** (domain): kind, footprint size, collision, has-damaged-look flag — no pictures.
- **Object type art** (adapter): normal and damaged picture for each object type.
- **Game session** (application): start view, saved view while paused, whether the menu background is active.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 70 pre-existing automated tests pass after the refactor, plus the new tests.
- **SC-002**: 100% of the 42 playtest steps from features 001 and 002 give the same result as before.
- **SC-003**: Screenshots of the menu and of the map at three fixed zoom levels match the pre-refactor screenshots.
- **SC-004**: The layer check reports 0 forbidden references across all source files.
- **SC-005**: The startup file contains no game rules or flow decisions, and is at least 30% shorter than before (155 lines today).
- **SC-006**: Drawing the 100×100 map at 0.5× takes at most 3.6 ms per frame on average (baseline 3.25 ms + 10%) on the same machine and method.
- **SC-007**: A developer can tell which layer any file belongs to from its folder alone, for 100% of game source files.

## Assumptions

- The four layer names and their contents come from Constitution Principle VII; this spec doesn't revisit them.
- Behaviour and visuals are frozen. Any bug found during the refactor is recorded, not fixed here, unless fixing it is required to keep behaviour identical.
- The global namespace object (`MCW`) and the "classic scripts, no build" approach stay (Constitution VI); layers are separated by folder and by what each file references, not by a module system.
- "Before" screenshots, test results and the 3.25 ms draw-time baseline are captured at the start of the work on the same machine.
- Map definition files keep their current format and content; only their folder may change.
- No new player-facing feature is added.
