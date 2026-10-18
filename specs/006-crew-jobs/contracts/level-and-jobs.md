# Contract: Jobs and the Level's Crews

## `MCW.jobs` (domain data, `js/domain/jobs.js`)

```js
MCW.jobs = {
  road:     { id: "road", name: "Road Crew", speed: 4.0,
              match: { road: "best" },
              advantage: { type: "speed", factor: 1, text: "Fastest vehicle" } },
  builders: { id: "builders", name: "Builders", speed: 2.5,
              match: { building: "best", road: "help" },
              advantage: { type: "points", kind: "building", factor: 1.5, text: "+50% points on roofs" } },
  electric: { id: "electric", name: "Electricians", speed: 3.5,
              match: { streetlight: "best", building: "help", pump: "help" },
              advantage: { type: "repair", kind: "streetlight", factor: 0.6, text: "Fast streetlight repairs" } },
  drainage: { id: "drainage", name: "Drainage Team", speed: 3.0,
              match: { pump: "best", road: "help" },
              advantage: { type: "repair", kind: "pump", factor: 0.7, text: "Fast pump repairs" } },
  general:  { id: "general", hidden: true, ... }   // legacy one-crew levels only
};
```

To add or rebalance a job, edit this table. Every damage kind in a level must keep at least
one Best crew in that level, and `checkLevel` reports it otherwise.

## Level `crews` (`levels/trial.js`)

```js
crews: [
  { id: "road",     job: "road",     leader: "Minh", portrait: "char_a", depot: [4, 9] },
  { id: "builders", job: "builders", leader: "Hoa",  portrait: "char_b", depot: [3, 9] },
  { id: "electric", job: "electric", leader: "Linh", portrait: "char_c", depot: [5, 8] },
  { id: "drainage", job: "drainage", leader: "Tuan", portrait: "char_a", depot: [5, 10] }
],
warnScale: 0.7,
rightCrewBonus: 40,
target: 10,
```

The order of `crews` is the crew-bar order and the 1–4 key order.

## `MCW.checkLevel` additions

On top of the feature-005 rules:

1. Either `crews` (1–6 entries) or the legacy `depot` + `crew.speed` must be present.
2. Crew `id`s are unique; every `job` is a known, non-hidden job; every `depot` is passable.
3. `portrait` is one of `char_a`, `char_b` or `char_c`.
4. Every kind used in `schedule` has a crew whose job is `best` at it.
5. Every schedule target is reachable by road from the depot of at least one Best crew for
   its kind.
6. Each kind's target rule (`objectTypes` / `objectKind` / `excludeTypes`) holds, e.g. a
   `streetlight` entry must target a lightpole.
7. `warnScale > 0` and `rightCrewBonus ≥ 0` when given.
