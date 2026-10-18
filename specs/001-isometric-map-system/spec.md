# Feature Specification: Isometric Tile Map System

**Feature Branch**: `001-isometric-map-system`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Create a 2D map system for a browser-based game. The map must support: tile-based terrain, multiple terrain types, camera scrolling, map boundaries, zooming, a coordinate system for future characters, collision information for obstacles. This is the first feature of a larger game. Design the specifications to support future characters, movement, and interactions."

## Overview

This is the foundation of the rainy-season city repair game. It delivers a city map that the player can see and explore, built from the isometric tiles in the project's `Isometric City` asset pack (128×64 diamond tiles). The map knows what is on every tile: its terrain, any building or prop on it, and whether it can be crossed. It also gives every tile a fixed address. Future features (workers, vehicles, routing, incidents, flooding) build on these addresses and on the collision information without changing the map itself.

**Core loop served** (Constitution Principle II): the "move along roads to the incident" step. Every later step of the loop happens on this map.

**Out of scope for this feature**: characters, vehicles, pathfinding, incidents, weather, UI menus, saving progress. This feature only provides the data and queries those features will need.

## Clarifications

### Session 2026-10-16

- Q: How should map layouts be written? → A: A hand-written text grid (one character per tile) plus a list of placed objects.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the city map (Priority: P1)

The player opens the game in a browser and sees an isometric city drawn from the asset pack: grass, dirt, water, concrete and asphalt ground; a road network whose straight pieces, corners, T-junctions, crossroads and dead ends join seamlessly; bridges over a canal; and buildings, trees and props on their tiles. Objects nearer to the viewer correctly cover objects behind them. The map's layout comes from a map definition file, so a different layout can be shown just by changing that file.

**Why this priority**: Nothing else can be built or shown until the map is visible. This alone is a demoable result.

**Independent Test**: Open the game with the sample map definition and compare the screen with the definition: every tile shows the right terrain, every road tile shows the correct piece for its neighbours, and buildings appear in front of/behind each other correctly.

**Acceptance Scenarios**:

1. **Given** a map definition, **When** the game starts, **Then** every tile is drawn with the terrain type the definition gives it.
2. **Given** a road tile, **When** it is drawn, **Then** the piece shown (straight, corner, T-junction, crossroads, dead end) matches which of its four neighbours are also road or bridge, with no gaps or mismatched curbs.
3. **Given** a water tile next to a land tile, **When** they are drawn, **Then** the matching shoreline edge or corner tile is shown so the canal looks continuous.
4. **Given** a building that covers several tiles (e.g. 2×2), **When** the map is drawn, **Then** it appears once over its full footprint and is drawn in correct depth order with neighbouring objects.
5. **Given** a map definition that references an unknown terrain or object type, **When** the game loads it, **Then** the game still starts, draws a clearly visible placeholder on that tile, and reports the problem in the developer console.

---

### User Story 2 - Scroll and zoom around the map (Priority: P2)

The map is larger than the screen. The player moves the view by dragging with the mouse or using the arrow / WASD keys, and zooms with the mouse wheel or + / − keys. Zooming keeps the point under the mouse cursor in place. The view never leaves the map: the player can't scroll into empty space past the edges or zoom out further than the whole map.

**Why this priority**: The game needs maps bigger than one screen, and the player must be able to look anywhere on them. It builds directly on Story 1.

**Independent Test**: Load a map bigger than the screen; drag, use the keys and the wheel; confirm the view moves smoothly, the zoom stays centred on the cursor, and the view stops at all four map edges and at the zoom limits.

**Acceptance Scenarios**:

1. **Given** the map is shown, **When** the player drags with the mouse, **Then** the map follows the pointer one-to-one.
2. **Given** the map is shown, **When** the player holds an arrow or WASD key, **Then** the view scrolls steadily in that direction at the same on-screen speed regardless of zoom level.
3. **Given** the view is at a map edge, **When** the player keeps scrolling outward, **Then** the view does not move past the edge.
4. **Given** the cursor is over a tile, **When** the player zooms with the wheel, **Then** that tile stays under the cursor while the scale changes.
5. **Given** the zoom is at its minimum or maximum, **When** the player zooms further, **Then** nothing changes.
6. **Given** the browser window is resized, **When** the resize ends, **Then** the map fills the new window and the view is still within bounds.
7. **Given** the map is smaller than the screen at the current zoom, **When** it is shown, **Then** it is centred and cannot be scrolled.

---

### User Story 3 - Point at a tile and know where it is (Priority: P3)

When the player moves the mouse over the map, the tile under the cursor is highlighted, and clicking a tile selects it. A small info readout (developer mode) shows that tile's coordinates, terrain, object and passability. Under the hood, the game can convert between a tile address, a precise position on the map, and a point on the screen in every direction, and a future character can be placed on any tile or at any point between tiles.

**Why this priority**: Every future interaction (selecting an incident, assigning a worker, showing a route) depends on knowing exactly which tile the player is pointing at, and on characters having a position on the map.

**Independent Test**: With developer mode on, hover and click tiles at different zoom levels and scroll positions; confirm the highlighted tile is always the one visually under the cursor (including at tile edges and over tall buildings) and the readout values match the map definition.

**Acceptance Scenarios**:

1. **Given** the cursor is over the diamond of a tile, **When** it moves, **Then** exactly that tile is highlighted, at any zoom level or scroll position.
2. **Given** the cursor is outside the map, **When** it moves, **Then** no tile is highlighted.
3. **Given** the player clicks a tile, **When** developer mode is on, **Then** the readout shows its column, row, terrain type, object (if any) and passability.
4. **Given** a test marker placed at a tile address, **When** the map is scrolled or zoomed, **Then** the marker stays on that tile.
5. **Given** a test marker placed at a position halfway between two tiles, **When** it is drawn, **Then** it appears exactly between their centres and is drawn in correct depth order with nearby buildings.
6. **Given** a click that is a drag (pointer moved more than a few pixels), **When** the mouse is released, **Then** it does not count as a tile selection.

---

### User Story 4 - Know which tiles can be crossed (Priority: P4)

Every tile carries collision information: whether a person on foot can cross it, whether a vehicle can cross it, and how much it slows movement. Buildings and deep water block movement; roads and bridges allow vehicles; grass, dirt and concrete allow people on foot but not vehicles. Future features can ask "can this tile be crossed by X?" and "which neighbouring tiles can be reached from here?", and can change a tile's collision at runtime (for example when a road floods or a tree falls on it). A developer overlay colours each tile by its collision status.

**Why this priority**: Movement and routing for workers is the next feature after the map. It needs this data, but the map is already viewable without it.

**Independent Test**: Turn on the collision overlay for the sample map and check every tile's colour matches the rules; through the developer tools, block a road tile and confirm both its overlay colour and the neighbour query change immediately.

**Acceptance Scenarios**:

1. **Given** the collision overlay is on, **When** the map is shown, **Then** each tile is tinted by status: passable by vehicles and people, people only, or impassable.
2. **Given** a building covering a 2×2 footprint, **When** collision is queried for any of its four tiles, **Then** all four are impassable.
3. **Given** a road tile, **When** its neighbours are queried for vehicles, **Then** only adjacent road or bridge tiles that are passable are returned, in the four directions (NE, SE, SW, NW).
4. **Given** a tile's collision is changed at runtime (e.g. marked blocked), **When** it is queried or drawn with the overlay, **Then** the new status is used immediately, and restoring it returns the original status.
5. **Given** a query for a tile outside the map, **When** it is made, **Then** the answer is "impassable" and nothing breaks.

---

### Edge Cases

- **Very small maps** (e.g. 1×1 or smaller than the screen): the map is centred and scrolling is disabled; zoom limits still apply.
- **Very large maps** (e.g. 100×100): only tiles in view are drawn, so the frame rate stays smooth.
- **Bad map files**: a missing or invalid map definition shows a clear "map failed to load" message on screen instead of a blank page.
- **Inconsistent map data**: terrain grid rows of unequal length (shorter rows are padded with grass), objects anchored outside the grid, overlapping building footprints, and a bridge not over water are reported in the console. The first object placed wins.
- **Tall objects**: pointing at the top of a tall building highlights the ground tile under the cursor, not the building's base tile. Picking objects by their artwork is left to a later feature.
- **Fast input**: very fast wheel input or trackpad pinch never pushes zoom past its limits or causes visible jumps.
- **Window focus lost while dragging**: the drag ends cleanly and the map is not left "stuck" to the pointer.
- **Damaged assets**: damaged versions of a road or building can be shown in place of the normal one without changing the tile's address.

## Requirements *(mandatory)*

### Functional Requirements

**Map & terrain**

- **FR-001**: The map MUST be a rectangular grid of tiles with a configurable number of columns and rows, shown in an isometric (diamond) projection matching the asset pack's 128×64 tile shape.
- **FR-002**: Each tile MUST have exactly one terrain type. At minimum the terrain types are: grass, dirt, concrete, asphalt, water, road and bridge.
- **FR-003**: Each terrain type MUST carry default collision information (see FR-020) and one or more visual variants (e.g. grass with puddles, damaged road).
- **FR-004**: Road tiles MUST automatically show the correct piece (straight, corner, T-junction, crossroads or dead end) based on which neighbouring tiles are road or bridge. The map author marks a tile as "road" only.
- **FR-005**: Water tiles next to land MUST automatically show matching shoreline edges and corners.
- **FR-006**: A tile MAY hold one object (building or prop). An object MAY cover a footprint of several tiles (at least 1×1 and 2×2). Each object has a type, a visual variant (e.g. normal / damaged) and its own collision information.
- **FR-007**: The map layout MUST come from a map definition kept separate from the game's code, so new maps can be added without changing code. A map definition MUST consist of:
  - a **terrain grid** written as text, one line per row and one character per tile (e.g. `.` grass, `,` dirt, `#` concrete, `=` asphalt, `~` water, `r` road, `b` bridge), where the map size is taken from the number of lines and characters;
  - a **legend** mapping each character to a terrain type (a default legend is provided, and a map may override it);
  - an **object list**, each entry giving the object type, visual variant and anchor tile (column, row).
  Rows of unequal length or unknown characters MUST be reported in the console (see Edge Cases).
- **FR-008**: Terrain, objects and characters MUST be drawn in correct depth order, so things nearer the viewer cover things behind them.
- **FR-009**: The map MUST be able to switch a tile's or object's visual variant at runtime (e.g. normal → damaged) without reloading the map.

**Camera: scrolling, zoom, boundaries**

- **FR-010**: The player MUST be able to scroll the view by dragging with the mouse and with the arrow and WASD keys.
- **FR-011**: The player MUST be able to zoom with the mouse wheel and the + / − keys, between a minimum and maximum zoom level. Defaults: 0.5× to 2× of the tiles' original size, starting at 1×.
- **FR-012**: Zooming with the wheel MUST keep the map point under the cursor fixed on screen. Zooming with keys MUST keep the screen centre fixed.
- **FR-013**: The view MUST be limited to the map's bounding area plus a small margin. The player MUST NOT be able to scroll so that the map leaves the screen entirely.
- **FR-014**: When the whole map fits on screen at the current zoom, it MUST be centred and scrolling MUST be disabled.
- **FR-015**: The map MUST fill the browser window and adapt when the window is resized, keeping the view within bounds.
- **FR-016**: The game MUST be able to move the camera to centre on a given tile or map position, instantly or with a short smooth glide, so later features can "jump to" incidents.

**Coordinate system**

- **FR-017**: Every tile MUST have a unique, fixed address of (column, row) integers starting at (0, 0). The four neighbour directions are named NE, SE, SW and NW, matching the asset names.
- **FR-018**: The game MUST provide a continuous map position (fractional column/row) for anything placed on the map, so future characters can stand on a tile centre or be partway between tiles.
- **FR-019**: The game MUST convert between tile address, map position and screen point in every direction, correctly at any zoom level or scroll position, including working out which tile is under a given screen point.
- **FR-020**: The tile under the mouse cursor MUST be highlighted, and clicking (without dragging) MUST select that tile and notify any interested feature of the selection.

**Collision**

- **FR-021**: Each tile MUST expose collision information made of: passable on foot (yes/no), passable by vehicle (yes/no), and a movement cost multiplier (1 = normal; higher = slower).
- **FR-022**: Default collision MUST be:

  | Terrain / object | On foot | Vehicle | Cost |
  |---|---|---|---|
  | Road, bridge | yes | yes | 1 |
  | Grass, dirt, concrete, asphalt ground | yes | no | 1 |
  | Water | no | no | — |
  | Building | no | no | — |
  | Small prop (sign, flowers, trash can) | yes | yes | 1 |
  | Tree | no | no | — |

- **FR-023**: A tile's effective collision MUST combine its terrain, its object (if any) and any runtime override, with the most restrictive value winning.
- **FR-024**: Features MUST be able to set and clear runtime collision overrides per tile (e.g. "blocked", "slow ×2"), and the change MUST take effect immediately for queries and the overlay.
- **FR-025**: The game MUST answer, for any tile and movement type (on foot / vehicle): whether it is passable, its movement cost, and the list of passable neighbouring tiles (NE, SE, SW, NW). Tiles outside the map MUST be reported as impassable.
- **FR-026**: The map MUST notify interested features when a tile's collision changes, so later features (e.g. routing) can react.

**Developer aids**

- **FR-027**: A developer mode, toggled by a key, MUST show: a grid outline, the coordinates and details of the hovered/selected tile, a collision overlay coloured by passability, and the current frame rate.
- **FR-028**: Developer mode MUST allow placing a test marker on any tile or map position, to verify the coordinate system before real characters exist.

### Key Entities

- **Map**: The playing field. It has a size in columns and rows, a grid of tiles, a list of placed objects, and the map definition it was loaded from.
- **Tile**: A single grid cell. It has an address (column, row), a terrain type, a visual variant, an optional reference to the object covering it, and an optional runtime collision override.
- **Terrain Type**: The kind of ground: its name, default collision and the visuals it can use, including how it joins to its neighbours (road pieces, shorelines).
- **Map Object**: A building or prop. It has a type, a visual variant (normal/damaged), an anchor tile, a footprint size and its own collision.
- **Collision Info**: For a tile, whether it can be crossed on foot, whether it can be crossed by vehicle, and its movement cost.
- **Map Position**: A continuous position on the map in fractional column/row, used for characters and markers.
- **Camera**: The player's view. It has a centre position, a zoom level, zoom limits and scroll bounds derived from the map size and window size.
- **Map Definition**: The external description of one map layout, used to build the Map. It contains a text terrain grid, a character-to-terrain legend and an object list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The sample city map (at least 30×30 tiles) is visible and explorable within 5 seconds of opening the game.
- **SC-002**: Scrolling and zooming stay smooth with no visible stutter on a mid-range laptop, on a map of up to 100×100 tiles.
- **SC-003**: In a check of 50 random cursor positions across different zoom levels and scroll positions, 100% highlight the tile visually under the cursor.
- **SC-004**: 100% of road tiles in the sample map show the piece that matches their neighbours, with no visible gaps or mismatched curbs.
- **SC-005**: The player can never scroll the map fully off screen or zoom beyond the limits, verified by trying each of the four edges and both limits.
- **SC-006**: A new map layout can be shown by adding or editing only a map definition, with no code changes.
- **SC-007**: For every tile of the sample map, collision answers match the rules in FR-022, and a runtime override is reflected in the next query and the next drawn frame.
- **SC-008**: A first-time player can find a specific named building on the sample map using only scroll and zoom in under 30 seconds.

## Assumptions

- **Projection**: isometric, 128×64 px diamond tiles, matching the `Isometric City` asset pack. A top-down view is not required.
- **Grid movement**: there are four neighbour directions (NE, SE, SW, NW), matching the road tiles in the pack, which only connect on the four diamond edges. Diagonal moves are not supported.
- **Height**: tiles are on a single flat height level. Bridges are visual only and don't create a second level.
- **Sample map**: one sample city map is delivered with this feature. It contains at least: residential houses, a hospital, a market stall, a garage/autoshop, a water tower (pump station), a park with trees, a canal with bridges, and a connected road network.
- **Input**: desktop mouse and keyboard only; touch and pinch gestures are optional.
- **Developer mode**: a debugging tool only; it doesn't need polished visuals.
- **Missing artwork**: features listed in the asset gap list (flood overlays, fallen trees, drains) are not needed here. Runtime variants use the existing normal/damaged art.
- **Not included**: saving map state, in-game map editing tools and external map-editor import. Map definitions are written by hand as text grids.
