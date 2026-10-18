# Feature Specification: Map Decorator

**Feature Branch**: `004-map-decorator`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "build a feature where i can decorate my map using my tiles set"

## Overview

Today a map can only be made by hand-editing its text grid and object list in a `maps/*.js`
file. This feature adds a **decorate mode** for the development team: an in-game map editor
where a developer picks pieces from the project's `Isometric City` tile set (ground and road
tiles, buildings, props), paints or places them straight onto the isometric map and sees the
result immediately. When the map is ready, the developer exports it as a map file in the same
format as the existing `maps/*.js` files and sends it to another developer, who adds it to the
game or opens it in their own decorate mode to keep working on it.

The decorator works with the map model from `001-isometric-map-system`: terrain painted here
is still a terrain type (so roads still join up and shorelines still form on their own), and
buildings and props are still map objects with a footprint and collision.

**Who uses it**: developers on the team only. Decorate mode is opened from a URL setting, like
the existing developer settings (`?dev=1`, `?map=…`). Players never see it, and the main menu
and normal play do not change.

**Core loop served** (Constitution Principle II): the map content that the whole loop happens
on. With the decorator, city layouts for the "move along roads to the incident" step can be
built, shared and changed in minutes instead of by editing text. It adds no new gameplay rules.

**Out of scope for this feature**: a player-facing decorate option (a possible later feature),
characters and vehicles from the tile set (they move, so they are not decorations), new
artwork, raising or lowering the ground, resizing an existing map, live or simultaneous
editing by several developers, and any decoration "cost" or budget.

## Clarifications

### Session 2026-10-17

- Q: Who is the decorator for, and where is it entered from? → A: Developers on the team, to create sample maps and send the map file to other developers. It is opened by a URL setting, not from the main menu. (This first had the answer "players, from the main menu", which the user later changed.)
- Q: Which maps can be decorated? → A: Both. Any existing map (as a working copy) or a new blank map of a chosen size.
- Q: When are the decorations saved? → A: Only when the developer presses Save. Leaving with unsaved changes asks "Save / Discard / Cancel".
- Q: Can a map file received from another developer be loaded back in? → A: Yes. Decorate mode can import a map file to view or keep editing it. Broken files are rejected with a clear message.
- Q: How does the main menu's Play pick a map? → A: No change. Play works as in `002-main-menu` and the map is still chosen with `?map=<id>`. (This replaced an earlier answer, "Play opens a map list", which only mattered while the decorator was a player feature.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Paint ground and roads onto the map (Priority: P1)

The developer opens the game with the decorate setting, choosing an existing map or a new
blank map. A tile palette appears listing the ground types (grass, dirt, concrete, asphalt,
water, road, bridge), each shown with its picture from the tile set. The developer picks one
and clicks or drags across the map; each tile under the cursor changes to that ground type.
Roads painted next to roads join up automatically, and water painted next to land gets its
shoreline, exactly as on a loaded map.

**Why this priority**: Ground and roads make up most of a map and decide where things can
move. Painting them on its own already lets a developer shape a city, so it is a usable first
version.

**Independent Test**: Open decorate mode on the sample map, paint a new loop of road and a
small pond, and check that every road piece and shoreline is drawn correctly and that the
collision overlay (developer mode) matches the new ground.

**Acceptance Scenarios**:

1. **Given** the game is opened with the decorate setting and a map id, **When** it loads, **Then** decorate mode opens on a working copy of that map, without the main menu.
2. **Given** the game is opened with the decorate setting and no map id, **When** it loads, **Then** the developer can choose an existing map or create a new blank map with a name, an id and a size.
3. **Given** decorate mode is open, **When** the developer picks a ground type and clicks a tile, **Then** that tile changes to the chosen ground type immediately.
4. **Given** a ground type is picked, **When** the developer holds the mouse button and drags, **Then** every tile the cursor passes over is painted, with no gaps even when dragging fast.
5. **Given** the developer paints a road tile next to existing road, **When** it is drawn, **Then** it and its neighbours show the correct joined pieces (straight, corner, T-junction, crossroads, dead end).
6. **Given** the developer paints water next to land, **When** it is drawn, **Then** the matching shoreline edges and corners appear.
7. **Given** the developer paints a tile, **When** collision is queried for it, **Then** the answer follows the new ground type's default collision.
8. **Given** a tile is covered by a building, **When** the developer paints ground on it, **Then** the ground under the building changes but the building stays.

---

### User Story 2 - Place and remove buildings and props (Priority: P2)

The palette also lists buildings and props from the tile set, grouped by category (e.g.
houses, shops, public buildings, trees and nature, street props) and searchable by name. When
the developer picks one and moves over the map, a see-through preview of it follows the
cursor, covering its full footprint, tinted green where it can go and red where it cannot.
Clicking places it. An eraser tool removes the object under the cursor. The developer can
also switch a placed object between its normal and damaged look when a damaged version
exists.

**Why this priority**: Buildings and props are what makes the city look like a city, but they
need the ground to be in place first.

**Independent Test**: In decorate mode, place a 1×1 house, a 2×2 hospital and a tree, try to
place a building on top of another, then erase one object, and check placement, blocking and
removal all behave as described.

**Acceptance Scenarios**:

1. **Given** a building or prop is picked, **When** the cursor moves over the map, **Then** a preview of it covering its full footprint follows the cursor.
2. **Given** the preview's whole footprint is inside the map and free of other objects, **When** the developer clicks, **Then** the object is placed there and drawn in correct depth order with its neighbours.
3. **Given** any tile of the footprint is outside the map or already covered by an object, **When** the preview is shown, **Then** it is tinted red, and clicking places nothing.
4. **Given** the eraser is picked, **When** the developer clicks any tile of a placed object's footprint, **Then** the whole object is removed and its tiles show the ground underneath.
5. **Given** a placed object has a damaged version, **When** the developer switches its look, **Then** it is redrawn as damaged (or back to normal) without moving.
6. **Given** the developer types part of a name into the palette search, **When** results appear, **Then** only matching pieces are listed.
7. **Given** objects are placed or removed, **When** collision is queried for their tiles, **Then** the answer reflects the change immediately.

---

### User Story 3 - Save, export and send the map to another developer (Priority: P3)

While decorating, the developer can undo and redo changes and save their work in progress in
the browser. They can try the map in normal play and come back to keep decorating. When it is
ready, they export it as a map file in the same format as the existing `maps/*.js` files and
send it to a teammate (by chat, email or a commit). The teammate either adds the file to the
game's `maps/` folder so it can be played with `?map=<id>`, or imports it into their own
decorate mode to look at it or keep working on it.

**Why this priority**: Sharing maps between developers is the reason for the tool, but it
depends on Stories 1 and 2 to have a map worth sharing.

**Independent Test**: Make ten changes, undo five and redo two, and check the map matches each
step. Save, reload the page and check the work is still there. Export the map, then on a
second computer (or after clearing browser storage) import the file into decorate mode, and
also add it to `maps/`, and check both show the same layout.

**Acceptance Scenarios**:

1. **Given** the developer has made changes, **When** they undo (button or Ctrl+Z), **Then** the most recent change is reversed; a whole drag-paint stroke counts as one change.
2. **Given** the developer has undone a change, **When** they redo (button or Ctrl+Y / Ctrl+Shift+Z), **Then** it is applied again; making a new change clears the redo history.
3. **Given** the developer has saved, **When** they close and reopen the browser and open decorate mode, **Then** their saved work is listed and opens exactly as it was at the last save.
4. **Given** the developer has unsaved changes, **When** they try to leave decorate mode, **Then** they are asked "Save / Discard / Cancel": Save keeps the changes and leaves, Discard leaves and the work stays as at the last save, Cancel stays in decorate mode with nothing lost.
5. **Given** the developer has unsaved changes, **When** they close or reload the browser tab, **Then** the browser's standard "leave this page?" warning appears.
6. **Given** the developer chooses "Test play", **When** play starts, **Then** the current layout (including unsaved changes) is played normally, and returning puts them back in decorate mode with nothing lost.
7. **Given** the developer exports the map, **When** the file is downloaded, **Then** it is named `<map id>.js`, has the same layout and style as the existing `maps/*.js` files, and decorate mode shows the one line to add to `index.html` to include it.
8. **Given** a teammate puts an exported file into `maps/` and adds that line, **When** they open the game with `?map=<id>`, **Then** it plays with the same ground, roads, objects and collision as in the decorator.
9. **Given** a teammate imports an exported file in decorate mode, **When** it opens, **Then** it shows the same layout and can be decorated, saved and exported again.
10. **Given** a developer imports a file that is not a valid map file, **When** the import runs, **Then** a clear message explains why it could not be loaded, and nothing is created or changed.
11. **Given** the developer decorates the shipped sample city, **When** they save or export, **Then** the original `maps/sample-city.js` is unchanged; only the working copy and exported file contain the changes.

---

### Edge Cases

- **Placing a road under a building**: allowed, as long as the building stays; the building still blocks movement because the most restrictive collision wins.
- **Map problems found while decorating** (e.g. a bridge not over water): allowed, but listed as warnings in decorate mode, reported the same way a loaded map reports them (see `001`). Exporting still works, and the warnings are shown again at export.
- **Map id already used by another map** (e.g. exporting a new map with id `tiny`): decorate mode warns at export that adding the file would clash with an existing map, and suggests a different id.
- **Painting with the eraser on empty ground**: nothing happens and no undo step is recorded.
- **Painting the same type onto a tile that already has it**: no change and no undo step.
- **Dragging off the map edge while painting**: tiles outside the map are ignored; the stroke continues when the cursor comes back.
- **Scrolling and zooming while decorating**: works as in normal play (keyboard, wheel), but a left-drag paints instead of scrolling; scrolling by drag uses the right or middle mouse button.
- **Browser storage full or blocked**: the developer is told the work could not be saved, and decorating and exporting keep working in the current session.
- **Saved work in the browser that is damaged**: it is skipped, and the problem is reported in the developer console.
- **Very large maps** (e.g. 100×100): painting and placing stay smooth.
- **Leaving decorate mode mid-stroke** (e.g. focus lost while dragging): the stroke ends cleanly and counts as one change, and it is unsaved until the developer saves.
- **Browser crash with unsaved changes**: the changes since the last save are lost; the work reopens as it was at the last save.
- **Imported file from an older or newer version of the game** naming a terrain or object this copy does not know: rejected with a message naming the unknown types.

## Requirements *(mandatory)*

### Functional Requirements

**Decorate mode**

- **FR-001**: Decorate mode is a developer tool. It MUST be opened by a URL setting (e.g. `?edit=1`, optionally with `&map=<id>`) in the same way as the existing `?dev=1` and `?map=` settings. It MUST NOT appear in the main menu, and the main menu and normal play MUST work exactly as in `002-main-menu` when the setting is absent.
- **FR-002**: When opening decorate mode, the developer MUST be able to choose either:
  - **an existing map**: any map registered in the game, or one of their saved works in progress. Decorating a registered map works on a copy, and the map's file in `maps/` never changes; or
  - **a new blank map**, giving a display name, a map id (lowercase letters, digits and hyphens) and a size from 5×5 up to 100×100 tiles (default 30×30). It starts as all grass with no objects.
- **FR-002a**: Saved works in progress MUST be listed by name and id when decorate mode opens. The developer MUST be able to rename (name and id) and delete them, with deletion confirmed first.
- **FR-003**: While in decorate mode, game activity (attract mode, future incidents) MUST be paused; scrolling, zooming and tile highlighting MUST keep working as in `001`.
- **FR-003a**: The developer MUST be able to "Test play" the current layout, including unsaved changes, and return to decorate mode with the layout and undo history unchanged.

**Palette**

- **FR-004**: Decorate mode MUST show a palette containing every ground type from the map system (grass, dirt, concrete, asphalt, water, road, bridge) and every building and prop known to the map system, each with its picture from the tile set.
- **FR-005**: Buildings and props in the palette MUST be grouped by category and searchable by name; the palette MUST show each piece's footprint size.
- **FR-006**: The palette MUST also offer an eraser tool, and MUST clearly show which piece or tool is currently selected.
- **FR-007**: Characters and vehicles from the tile set MUST NOT appear in the palette.

**Painting ground**

- **FR-008**: With a ground type selected, clicking a tile MUST set its ground type, and dragging MUST paint every tile the cursor passes over (no skipped tiles between pointer positions).
- **FR-009**: Painted roads and water MUST use the same automatic joining (road pieces, shorelines) as loaded maps, updating the painted tile and its neighbours immediately.
- **FR-010**: Painting ground MUST NOT remove or move an object on that tile.

**Placing objects**

- **FR-011**: With a building or prop selected, a see-through preview covering its full footprint MUST follow the cursor, marked as allowed or not allowed.
- **FR-012**: An object MUST only be placed when its full footprint is inside the map and no tile of the footprint is covered by another object.
- **FR-013**: The eraser MUST remove the whole object covering the clicked tile.
- **FR-014**: The developer MUST be able to switch a placed object between its normal and damaged look when the tile set has a damaged version.

**Changes, history and saving**

- **FR-015**: Every change MUST update the map's collision immediately, so queries, the developer overlay and test play reflect it.
- **FR-016**: The developer MUST be able to undo and redo changes, with a whole drag-paint stroke counting as one change; at least the last 100 changes MUST be undoable.
- **FR-017**: Work MUST be saved only when the developer presses **Save** (button or Ctrl+S). Saved work is stored in the browser on that computer only, and MUST still be available after the browser is closed and reopened. Decorate mode MUST show clearly whether there are unsaved changes.
- **FR-017a**: Leaving decorate mode with unsaved changes MUST ask "Save / Discard / Cancel" (see User Story 3, scenario 4). Closing or reloading the tab with unsaved changes MUST trigger the browser's standard leave-page warning.
- **FR-017b**: A copy of a registered map, or a new blank map, MUST become a saved work in progress the first time it is saved. If it is discarded before its first save, nothing is kept.
- **FR-017c**: Saving MUST NOT clear the undo and redo history of the current session. That history is not kept once the developer leaves decorate mode.
- **FR-019**: The developer MUST be able to reset the work to its starting layout after confirming. For a copy of a registered map, that is the registered map's layout. For a new blank map, it is all grass.
- **FR-020**: If work cannot be saved, the developer MUST see a clear message, and decorating and exporting MUST keep working in the current session.

**Exporting and importing map files**

- **FR-018**: The developer MUST be able to export the current map as a downloaded file named `<map id>.js`. It MUST be in the same format as the existing `maps/*.js` map definition files: map id, display name, terrain text grid (one character per tile, using the default legend), and object list (type, anchor tile, and look when damaged). It MUST be readable and editable by hand, so changes show up clearly when two versions are compared.
- **FR-018a**: At export, decorate mode MUST show the exact line to add to `index.html` to include the new map. Putting the file in `maps/` and adding that line MUST be the only steps needed to play it with `?map=<id>`.
- **FR-018b**: At export, decorate mode MUST warn (without blocking the export) about map problems found by the map system and about a map id that is already used by a registered map.
- **FR-018c**: Decorate mode MUST offer **Import map file**. It opens a map file chosen by the developer (an exported file or any existing `maps/*.js` file) as a new work in progress, ready to decorate, save and export. If the id is already used by a saved work in progress, the developer is asked whether to replace it or import as a copy with a new id.
- **FR-018d**: Import MUST read only the map data from the file and MUST NOT run the file as code. It MUST reject a file that is not a valid map file, is larger than 100×100 tiles, or names terrain or objects the game does not know. It MUST show a clear message saying why, and create or change nothing.

### Key Entities

- **Decorate Session**: One visit to decorate mode on one map. It has the map being decorated, the selected piece or tool, the undo and redo history, and whether there are unsaved changes since the last save.
- **Palette Piece**: Something the developer can put on the map: a ground type, or a building/prop type with its picture, category, footprint and whether it has a damaged look.
- **Change**: One undoable step: the tiles whose ground changed (before and after), or the object placed, removed or switched. A drag stroke is one change.
- **Work in Progress**: a map being decorated, saved in the developer's browser. It has a display name, a map id, a size and its layout, and, if it started as a copy, the id of the registered map it came from. It can be reopened, renamed, deleted, reset and exported.
- **Map File** (a map definition from `001`, as a file): the `maps/<id>.js` file format shared between developers. It is the output of export and the input of import, and it is what the game loads.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer new to the tool can paint a connected road loop of at least 12 tiles and place 5 buildings on it in under 3 minutes without help.
- **SC-002**: A painted or placed piece appears on screen in the same frame the developer clicks, with no visible delay.
- **SC-003**: Drag-painting across a 100×100 map stays smooth, with no visible stutter on a mid-range laptop.
- **SC-004**: 100% of road and shoreline tiles created by painting show the correct joined piece, checked on a test pattern covering every road piece and shoreline shape.
- **SC-005**: After 20 mixed changes, undoing all of them returns the map to exactly its starting layout, and redoing all of them returns exactly the decorated layout.
- **SC-006**: A map that is saved and reopened, exported and imported, or exported and added to `maps/`, matches the decorated layout tile for tile in all three cases.
- **SC-007**: No object can end up overlapping another object or sticking out of the map through the decorator, checked by trying every edge and an occupied tile.
- **SC-008**: A developer who receives a map file can play it, or open it in decorate mode, within 2 minutes, following only what decorate mode shows at export.
- **SC-009**: Exporting an existing map such as `maps/sample-city.js` without changes and opening it gives the same layout as the original, and no action in decorate mode changes any file in `maps/`.

## Assumptions

- **Tile set**: "my tiles set" means the project's `Isometric City` asset pack that the map system already uses: the ground and road tiles from "Roads and Grounds", and the buildings and props the map system already knows. Adding new artwork is out of scope.
- **Joined pieces are automatic**: the developer paints "road" or "water"; the correct road piece or shoreline is picked automatically, as in `001`. Picking individual road pieces by hand is not needed.
- **One object per tile**: the `001` rule that each tile holds at most one object is kept.
- **Input**: desktop mouse and keyboard. Left button paints or places; right or middle button drags to scroll; keyboard and wheel scroll and zoom as in `001`.
- **Sharing**: maps move between developers only as exported files (sent by chat, email or a commit). There is no server or live sync, as required by Constitution Principle VI. Work in progress is stored in each developer's own browser.
- **Browsers cannot write project files**: decorate mode never changes files in `maps/` or `index.html`; adding a map to the game is a manual step the developer does with the exported file.
- **Map size**: a map's size is fixed once it exists. Only a new blank map gets to choose its size (FR-002).
- **Developer styling**: the palette and tools may look plain, like developer mode; they do not need to match the main menu.
- **Damaged look**: switching to the damaged look is a decoration choice only; it does not change collision.
- **No menu changes**: the main menu from `002-main-menu` is unchanged; a player-facing decorate option can be specified later as its own feature, reusing this editor.
