# Contract: Map Definition File

A map is a JavaScript file in `maps/` loaded with a `<script>` tag (works over `file://`).
It registers itself with the map registry:

```js
MCW.maps.register({
  id: "sample-city",            // required, unique
  name: "Sample City",          // optional display name
  legend: { "g": "grass" },     // optional; merged over the default legend
  terrain: `
..........rrrrrr
..........r....~
`,                              // required; see rules below
  objects: [                    // optional
    { type: "hospital_a", at: [3, 2] },
    { type: "house_small_blue_a", at: [6, 2], variant: "damaged" },
    { type: "autoshop_a", at: [8, 5], id: "garage", access: [8, 7] },
    { type: "tree_common_large", at: [1, 9] }
  ]
});
```

## Terrain grid rules

- One line = one row (row 0 first); one character = one tile (column 0 first).
- Leading and trailing blank lines are ignored; leading/trailing spaces on a line are
  **not** trimmed (space is not a valid tile character).
- `cols` = length of the longest line; `rows` = number of lines. Shorter lines are padded with
  the default terrain (`grass`) and a warning is logged.
- Unknown characters become `grass`, are drawn with a magenta placeholder outline, and a
  warning is logged.

## Default legend

| Char | Terrain |
|---|---|
| `.` | grass |
| `,` | dirt |
| `#` | concrete |
| `=` | asphalt |
| `~` | water |
| `r` | road |
| `b` | bridge (must sit between road/bridge tiles across water) |

## Object entry fields

| Field | Required | Meaning |
|---|---|---|
| `type` | yes | key in the object catalog (`js/core/catalog.js`); file names from the asset pack without the `bld_` / `prop_` prefix and `.png` suffix, e.g. `hospital_a`, `fruitstand_b`, `tree_pine_tall`, `sign_caution_a` |
| `at` | yes | `[col, row]` of the footprint's back (north-most) tile |
| `variant` | no | `"normal"` (default) or `"damaged"` |
| `id` | no | stable name other features can refer to (e.g. `"hospital"`) |
| `access` | no | `[col, row]` access tile; defaults per research R11 |

Ids are kept only when they are written in the file. Objects without an `id` get a generated
one at load time (`obj-N`), and the map decorator never writes those back. Files exported by
the map decorator (feature 004) use the layout in
[`specs/004-map-decorator/contracts/map-file.md`](../../004-map-decorator/contracts/map-file.md),
which also lists the literal-only rules a file must follow to be imported (plain data only: a
file that builds its grid with code, such as `maps/big.js`, loads in the game but can't be
imported).

## Validation outcome

`MCW.parseMap(def)` returns `{ map, warnings }` and never throws for content problems.
Warnings (each also logged with `console.warn`) are produced for: ragged rows, unknown
characters, unknown object types, footprints outside the map, overlapping footprints (later
one skipped), objects on water, and bridges not between road/bridge tiles. A missing `terrain`
field or an unregistered map id is an error: the game shows "Map failed to load: <reason>".
