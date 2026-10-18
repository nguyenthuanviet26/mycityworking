# Data Model: Main Menu

All logic objects live in `js/core/` with no DOM access (Constitution III).

## ScreenState

| Value | Shown | Map input | Rain | Background drift |
|---|---|---|---|---|
| `loading` | loading bar | off | off | off |
| `menu` | main menu | off | on | on |
| `howto` | How to Play panel | off | on if opened from `menu` | on if opened from `menu` |
| `credits` | Credits panel | off | on | on |
| `playing` | map + pause button | on | off | off |
| `paused` | pause menu over dimmed map | off | off | off |

## ScreenMachine (`MCW.ScreenMachine`)

| Field | Type | Notes |
|---|---|---|
| `state` | ScreenState | starts at `loading` |
| `returnTo` | `"menu"` \| `"paused"` \| null | where Back goes from `howto` |
| `focusOnShow` | string \| null | id of the button to focus when the screen appears |
| `busy` | boolean | true during a fade; actions are ignored while true |

### Transitions

| From | Action | To | `focusOnShow` |
|---|---|---|---|
| loading | `loaded` | menu | `btn-play` |
| menu | `play` | playing | — |
| menu | `openHowto` | howto (`returnTo = menu`) | `btn-howto-back` |
| menu | `openCredits` | credits | `btn-credits-back` |
| howto | `back` | `returnTo` | `btn-howto` (menu) / `btn-pause-howto` (paused) |
| credits | `back` | menu | `btn-credits` |
| playing | `pause` | paused | `btn-resume` |
| paused | `resume` | playing | — |
| paused | `back` | playing | — (Escape on pause = Resume) |
| paused | `openHowto` | howto (`returnTo = paused`) | `btn-howto-back` |
| paused | `toMenu` | menu | `btn-play` |

Any other (state, action) pair returns `false` and changes nothing. `escape()` maps to:
`back` on howto/credits/paused, `pause` on playing, nothing on menu/loading.

The machine emits `change { from, to, action }` so the UI can update.

## SavedView

| Field | Type |
|---|---|
| `wx`, `wy` | number (camera centre, world px) |
| `zoom` | number |
| `hovered`, `selected` | TileAddress \| null |

Captured on `playing → paused`, restored on `paused → playing`. Discarded on `toMenu`.

## Rain (`MCW.rain`)

| Field | Type | Rules |
|---|---|---|
| `count` | integer | 160 by default; constant |
| `x`, `y` | Float32Array(count) | screen px; `0 ≤ x < width + 60`, `−height ≤ y` at spawn |
| `speed` | Float32Array(count) | 700–1100 px/s |
| `len` | Float32Array(count) | 10–22 px |
| `wind` | number | −0.25 (x moves −0.25 px per px fallen) |
| `width`, `height` | number | viewport size |

`update(rain, dtMs)`: `y += speed·dt`, `x += wind·speed·dt`; a streak with `y − len > height`
or `x < −30` respawns at `y = −len − random·40` and a random `x`. Random numbers come from a
seeded generator stored on the object.

## Attract path (`MCW.attract`)

`positionAt(tMs, cols, rows)` → `{x, y}` map position on an ellipse of radii `0.22·cols`,
`0.22·rows` around `(cols/2, rows/2)`, period 90 000 ms. Zoom while attracting: 0.75.
