# Contract: Decorate Mode, URL settings and controls

Developer-facing behaviour. Plain styling is fine (spec Assumptions).

## URL settings

| URL | Result |
|---|---|
| `index.html` (no `edit`) | normal game, exactly as `002-main-menu` |
| `index.html?edit=1` | the chooser |
| `index.html?edit=1&map=<id>` | the editor on a copy of registered map `<id>`; an unknown id shows the chooser with an error line |
| `index.html?edit=1&work=<id>` | the editor on saved work `<id>`; if it's unknown, the chooser with an error line |
| `&dev=1` (with any of the above) | the developer overlay starts on |

`?menu=0`, `?zoom=` and `?center=` keep working in normal play. In the editor, `zoom` and
`center` set the start view.

## Chooser

Lists, in this order:

1. **Saved works**: name, id, size and saved time, each with *Open*, *Rename*, *Delete* (with
   confirmation).
2. **Registered maps**: name, id and size, each with *Decorate a copy*.
3. **New blank map**: name, id (suggested from the name), columns and rows (5–100, default 30).
   *Create* is disabled while any field is invalid, and the reason is shown next to the field.
4. **Import map file…**: picks a `.js` file (contract `map-file.md`). If its id equals a saved
   work's id, it asks *Replace the saved work* / *Import as a copy* (the id gets `-2`, `-3`, …)
   / *Cancel*.
5. **Back to the game**: goes to `index.html`.

## Editor layout

- **Left panel (palette)**: a search box, then sections *Ground*, *Houses*, *Shops & food*,
  *Public*, *Work*, *Trees & nature* and *Street*. Each piece is a thumbnail with its label and
  footprint (`2×2`). The selected piece is outlined. The tools row at the top has *Select* and
  *Eraser*.
- **Top bar**: map name and id, size, an unsaved-changes dot ("● Unsaved" or "Saved 14:02"),
  the problem count (click to list them; click a problem to centre on its tile), and the buttons
  *Undo*, *Redo*, *Save*, *Test play*, *Export*, *Reset*, *Leave*. *Import* is in the chooser.
- **Info strip** (Select tool): the selected tile's coordinates, terrain and object. If there's
  an object with a damaged look, it shows a *Show damaged* / *Show normal* button (FR-014).
- **Export panel**: a *Download `<id>.js`* button, the problems found (as warnings), the
  id-clash or replace note (research R13), and the 3 steps from `map-file.md` with a *Copy*
  button for the script line.

## Mouse

| Tool | Left click | Left drag | Hover |
|---|---|---|---|
| Select | select tile | scroll the map | tile highlight |
| Ground piece | paint the tile | paint every tile crossed (one change) | tile highlight |
| Building/prop | place if allowed | – | see-through preview over the footprint; diamonds green (allowed) or red (outside / occupied) |
| Eraser | remove the object on the tile (whole footprint) | remove every object crossed (one change) | the object's footprint outlined red |

Right or middle drag always scrolls. The wheel zooms at the cursor, as in `001`. The browser
menu on right-click is suppressed on the map while a tool other than Select is active.

## Keyboard (ignored while a text field has focus)

| Key | Action |
|---|---|
| Ctrl+Z | undo |
| Ctrl+Y, Ctrl+Shift+Z | redo |
| Ctrl+S | save (the browser's "save page" is suppressed) |
| E | Eraser tool |
| Esc | in testing: back to the editor; with a piece selected: Select tool |
| Arrows / WASD, + / −, Home | scroll and zoom, as in `001` |
| F3 / ` and the developer keys | as in `001`, but not B/V-on-tile while editing (V on a selected object still toggles its look) |

## Prompts

- **Leave with unsaved changes**: "Save changes to *<name>*?" with **Save** / **Discard** /
  **Cancel**.
- **Closing or reloading the tab with unsaved changes**: the browser's standard leave-page
  warning.
- **Reset**: "Reset *<name>* to its starting layout? You can undo this." with **Reset** /
  **Cancel**. Reset is undoable as one change.
- **Delete a saved work**: "Delete *<name>* from this browser? This cannot be undone." with
  **Delete** / **Cancel**.
- **Save failed**: "Could not save in this browser (<reason>). Your changes are still here;
  use Export to keep a copy." The prompt is dismissable, and the work stays dirty.

## Test play

The editor panel and top bar are hidden. A *Back to editor* button sits top-left. Input
behaves as in normal play, and the developer overlay is available. Collision overrides set
during test play are cleared when returning.
