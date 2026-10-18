# Contract: Map File (export and import)

The file developers send each other. It **is** a `maps/*.js` map definition file
(`specs/001-isometric-map-system/contracts/map-definition.md`), so the game loads it with a
`<script>` tag exactly like `maps/sample-city.js`.

## Export: what the decorator writes

File name: `<id>.js`, UTF-8, `\n` line endings, and a final newline.

```js
// Harbour Town (24x18). Made with the map decorator on 2026-10-17.
// Legend: . grass  , dirt  # concrete  = asphalt  ~ water  r road  b bridge
MCW.maps.register({
  id: "harbour-town",
  name: "Harbour Town",
  terrain: `
....rrrrrr..............
....r....r....~~~~......
`,
  objects: [
    { type: "hospital_a", at: [3, 2], id: "hospital" },
    { type: "house_small_blue_a", at: [6, 2], variant: "damaged" },
    { type: "tree_pine_tall", at: [1, 9] }
  ]
});
```

Rules:

1. The terrain uses the **default legend** only. One line per row, with no padding or trailing
   spaces. Every row has exactly `cols` characters.
2. Objects are one per line, sorted by `at` row, then column. Keys are written in this order:
   `type`, `at`, `variant` (only if `"damaged"`), `id` (only if the object was named), `access`
   (only if given).
3. Strings are written with double quotes and JSON escaping. `name` is the only free-text field,
   and `` ` `` or `${` in it is escaped.
4. The output is deterministic: exporting the same layout twice gives byte-identical files.
5. With no objects, it writes `objects: []`.

Round-trip guarantee (SC-006, SC-009): `parseMap(read(format(serializeMap(m))))` has the same
size, terrain per tile, and objects (type, anchor, variant, named id, access) as `m`.

## Import: what the decorator reads

`mapFile.read(text)` finds the first `MCW.maps.register(` call and reads its single argument
**as data, never as code**. The accepted syntax inside the argument:

| Allowed | Notes |
|---|---|
| `{ key: value, … }` | keys are bare identifiers or quoted strings; trailing comma OK |
| `[ value, … ]` | trailing comma OK |
| `"…"`, `'…'` | JSON-style escapes plus `\'` |
| `` `…` `` | template string **without** `${`; kept verbatim |
| numbers | integer or decimal, optional leading `-` |
| `true`, `false`, `null` | |
| `// …` and `/* … */` | anywhere whitespace is allowed |

Anything else is a read error that names the line, for example `Line 7: "foo" is not a value
(the file may only contain map data)`. That covers a bare identifier, a call, an operator,
`${`, or a second statement after the closing `);` other than comments. Text before the call
may only be comments and whitespace. `maps/sample-city.js` and `maps/tiny.js` follow these
rules. `maps/big.js` builds its grid with code, so it can't be imported. That is expected (it
would have to be run), and it can still be opened with *Decorate a copy*. Its export is a
plain-data file that can be imported.

## Import validation (after reading)

The reader returns a plain object. The application then checks it, and if any error is found
it rejects the file **without changing anything**:

| Check | Error message |
|---|---|
| `id` present and matches `^[a-z][a-z0-9-]{0,39}$` | `Map id "X" is not valid (use lowercase letters, digits and -)` |
| `terrain` is a non-empty string | `The file has no terrain grid` |
| size ≤ 100 × 100 | `The map is C×R tiles; the most is 100×100` |
| every character is in the file's legend (merged over the default) | `Unknown terrain character "q" at (col,row)` (up to 5 listed) |
| every object `type` is known | `Unknown object type "X"` (up to 5 listed) |
| `objects` (if present) is an array of entries with `type` and `at: [col,row]` | `Object #N has no valid "at" position` |
| file size ≤ 1 MB (checked before reading) | `The file is too big to be a map file` |

Problems that only make the map **look** wrong are accepted and shown as warnings, the same
as for a loaded map: ragged rows (padded with grass), overlapping or out-of-map objects
(skipped), bridges not crossing, and objects on water.

## Adding an exported file to the game

The export panel shows these steps (FR-018a, SC-008):

1. Put `<id>.js` in the `maps/` folder.
2. Add `<script src="maps/<id>.js"></script>` to `index.html` after the other `maps/` lines.
   This step is skipped when the file replaces an existing map (research R13).
3. Open `index.html?map=<id>`.
