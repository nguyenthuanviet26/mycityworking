# Contract: Level Definition File

A level is a script in `levels/` that registers plain data. It is loaded by a `<script>` tag
in `index.html` after the map files. The fields and rules are in
[../data-model.md](../data-model.md#level-definition-data-file-levelstrialjs).

```js
// levels/trial.js
MCW.levels.register({
  id: "trial",
  name: "Trial: First Storm",
  map: "trial",
  depot: [3, 9],                         // road tile beside the garage
  startView: { zoom: 1, center: [9, 9] },
  crew: { speed: 3 },
  target: 6,
  phases: [
    { name: "Drizzle",    durationS: 60, maxActive: 2, rain: 0.4 },
    { name: "Downpour",   durationS: 90, maxActive: 3, rain: 0.7 },
    { name: "Peak storm", durationS: 90, maxActive: 4, rain: 1.0 }
  ],
  schedule: [
    { at: 3,   kind: "road",     tile: [9, 4], tutorial: true },
    { at: 35,  kind: "building", object: "clinic" },
    { at: 65,  kind: "road",     tile: [14, 9] },
    // … 10 entries in total, sorted by "at"
  ],
  drainPerUrgentPerS: 1.2,
  refill: { normal: 5, early: 8 },
  earlyBonus: 50,
  stars: [900, 1300]
});
```

(The coordinates above are examples. The real ones come from `maps/trial.js`.)

## `MCW.checkLevel(level, map)` → `string[]`

Returns a list of problems; an empty list means the level is playable. Its checks:

1. `depot` is in bounds and vehicle-passable.
2. There are exactly 3 phases, with `durationS > 0`, non-decreasing `maxActive`, increasing
   `rain`, and a pace (entries ÷ length) that does not go down from one phase to the next.
3. `schedule` is sorted by `at`, every `at` lies in `[0, total length)`, every `kind` is
   known, and each entry has exactly one target of the kind's target type.
4. Each `tile` target is a road or bridge tile. Each `object` target exists and has damaged
   art.
5. Every target has at least one work tile, and a route from `depot` reaches it
   (`findRoute`).
6. At most one entry has `tutorial: true`, and if so it is the first.
7. `1 ≤ target ≤ schedule.length`, `stars[0] ≤ stars[1]`, and `refill.early ≥ refill.normal`.

At boot, a level with problems is **not** started: the problems are logged with
`console.warn("[level] …")` and the map opens in free-look mode (Principle I).

## Registry

`MCW.levels.register(def)`, `MCW.levels.get(id)`, `MCW.levels.forMap(mapId)` (the first level
whose `map` matches, or `null`).
