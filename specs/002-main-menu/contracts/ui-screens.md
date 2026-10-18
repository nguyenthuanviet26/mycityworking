# Contract: Screens, Content and Controls

## Element ids (used by tests and focus handling)

| Screen | Container id | Buttons (in order) |
|---|---|---|
| Main menu | `screen-menu` | `btn-play` Play · `btn-howto` How to Play · `btn-credits` Credits |
| How to Play | `screen-howto` | `btn-howto-back` Back |
| Credits | `screen-credits` | `btn-credits-back` Back |
| Pause menu | `screen-pause` | `btn-resume` Resume · `btn-pause-howto` How to Play · `btn-to-menu` Main Menu |
| In-game | — | `btn-pause` (top-right, `aria-label="Pause"`, shown only while playing) |

All screens live inside `#menu-layer`. Exactly one screen is visible at a time
(`hidden` attribute on the others).

## Content

**Main menu**
- Title: `CaptAIn` (the "AI" letters styled in the accent colour, text content unchanged)
- Tagline: `Keep the city running through the rainy season`

**How to Play**
- Summary: "Rain is flooding the city. As captain of the repair crew, you'll send the right
  workers along the roads to fix blocked drains, fallen trees and power cuts before things
  get worse. For now, explore the city map."
- Controls table:

  | Control | Action |
  |---|---|
  | Drag with the mouse | Move around the city |
  | Mouse wheel | Zoom in and out |
  | Arrow keys / W A S D | Scroll the map |
  | + / − | Zoom |
  | Home | Reset the view |
  | Click a tile | Select it |
  | Esc | Pause |

  (No developer-mode keys.)

**Credits**
- `Team CaptAIn`
- Thuan Viet · Phuong Nghi · Thy Phuong · Dieu Le
- `Made for Hackathon HK1 2026–27`
- `Art: "Isometric City" asset pack` (+ author/licence line from the pack when available)

**Pause menu**
- Heading: `Paused`

## Keys

| Key | Main menu | Panel (How to Play / Credits) | Playing | Pause menu |
|---|---|---|---|---|
| ↑ / ↓ | Move focus (wraps) | — | Scroll map | Move focus (wraps) |
| Tab / Shift+Tab | Move focus | Move focus | — | Move focus |
| Enter / Space | Activate focused button | Activate Back | — | Activate focused button |
| Esc | Nothing | Back | Pause | Resume |
| F3 / `` ` `` | Ignored | Ignored | Developer mode | Ignored |

## URL settings

| Setting | Effect |
|---|---|
| `?menu=0` | Skip the main menu; start playing immediately |
| `?map=<id>` | Map used behind the menu and for Play |
| `?dev=1` | Developer mode on when play starts |

## Script API (for later features)

| Member | Effect |
|---|---|
| `MCW.game.screens.state` | Current ScreenState |
| `MCW.game.screens.on("change", fn)` | `fn({from, to, action})` on every screen change |
| `MCW.game.menuOpen()` | `true` unless state is `playing` |
