# Research: Trial Level

**Feature**: `005-trial-level` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)

The Technical Context had no open unknowns: the stack, test harness, rendering and layering are
fixed by the constitution and features 001–004. The items below record the design choices this
feature needs and why.

## R1 — Where the round's rules live

**Decision**: Split the round into small DOM-free objects:

- **domain**: `findRoute` (shortest road route), `incidentKinds` (what can break), and
  `checkLevel` (is a level definition playable on its map);
- **application**: `Crew` (movement and repair state), `Round` (clock, phases, schedule,
  incidents, meter, score, result), `Hints` (tutorial steps), and `LevelRun`, which ties those
  three to the screen flow.

All of them are advanced by `update(dtMs)` from the existing frame loop.

**Rationale**: Constitution III and VII. Every rule in the spec (phase changes, urgency,
drain/refill, win/lose, routing, redirect) can then be unit-tested on `tests/index.html` by
calling `update` with chosen time steps. No canvas, DOM or timers are involved. `LevelRun`
keeps `main.js` free of flow logic.

**Alternatives considered**:

- One big `Round` class holding crew and hints too. Rejected because it would be harder to
  test and to split between teammates.
- Putting the round inside `GameSession`. Rejected because `GameSession` is about the camera
  and menu flow, and mixing them would grow it past its purpose.

## R2 — Time and determinism

**Decision**: The round's time is the sum of the `dtMs` values passed to `Round.update`. The
frame loop already caps each step at 100 ms. `update` is only called while the screen state is
`playing`, so pause, the pause menu, How to Play from pause and the result screen all freeze
the round automatically. Hiding the browser tab dispatches `pause` (R9).

Inside one `update`, events are processed in a fixed order:

1. schedule releases;
2. urgency;
3. crew movement and repair completion;
4. meter drain;
5. end check.

This makes the order of simultaneous events well defined.

**Rationale**: FR-004 (same play every time), FR-021 (pause freezes everything) and the edge
case "goal reached at the same moment the meter empties counts as a win". Because the
repair-completion step runs before the drain and end check, that edge case falls out naturally.

**Alternatives considered**: A fixed-timestep accumulator. Rejected for now, because the game
has no physics and repeatability only matters at the level of the schedule. Tests can still use
fixed steps.

## R3 — Routing

**Decision**: `MCW.findRoute(map, from, goals)` does a breadth-first search over
`map.neighbors(col,row,"vehicle")`, which only allows road and bridge tiles. It explores
directions in the fixed order NE, SE, SW, NW and stops at the first tile that is in the goal
set. It returns the list of tiles from `from` (excluded) to the goal (included). It returns
`[]` when `from` is already a goal, and `null` when no goal can be reached. Every road tile
costs 1, so BFS gives a shortest route.

**Goal set ("work tiles") for an incident**: the vehicle-passable tiles that touch the target's
footprint on one of its four sides. For a road incident, the footprint is the single tile; for
a building, it is the building's footprint. The crew parks *next to* the damage (spec US1,
"the road tile next to the incident"), and the multi-goal BFS picks the nearest side.

**Rationale**: On a 20×20 map BFS costs well under 1 ms, so there is no need for A* or caching
(Principle V). The fixed neighbour order makes routes identical on every play.

**Alternatives considered**:

- A* with a heuristic: no benefit at this size.
- Using `map.accessTile(id)`: it gives a single tile and only works for objects, while road
  incidents need a tile too.

## R4 — Crew movement and facing

**Decision**: The crew has a fractional map position (the tile centre plus progress towards the
next tile). It moves at `level.crew.speed` tiles per second (starting guess 3). Its facing is
the `MCW.iso.DIRS` name of the current step (NE/SE/SW/NW), which matches the vehicle file
suffixes (`veh_truck_yellow_NE.png` …).

**Redirect while driving**: the new route is computed from the tile the crew is currently
heading into. The crew finishes the step it is on, so it never jumps or reverses mid-tile.

**Return to depot**: after a repair, the crew routes to `level.depot`.

**Rationale**: FR-011–FR-014. Turning only at tile centres keeps the art (four diagonal
directions) correct.

## R5 — Incidents, the schedule and phase limits

**Decision**: The level holds a fixed, ordered `schedule` of incident entries, each with an
`at` time in seconds. The round goes through these states for each entry:

- An entry is **due** once `elapsed >= at`.
- A due entry is **released**, becoming an active incident, only if the number of active
  incidents is below the current phase's `maxActive`, and its target has no active incident.
- Otherwise it **waits** at the head of the queue.

Entries are released strictly in order. The "pace" of each phase is expressed by how densely
the schedule's `at` times fall inside it, and `checkLevel` checks that each phase's pace is not
slower than the phase before (FR-004a).

**Urgency**: an incident becomes urgent `kind.warnS` seconds after release, unless the crew is
repairing it. The tutorial incident (`tutorial: true`, at most one per level) cannot become
urgent until a crew has been sent to it (FR-023).

**Rationale**: Fixed and repeatable (FR-004), and the edge cases are covered: no two incidents
on one target, and "the schedule waits until one is repaired". It also gives a teammate a
single list to tune.

**Alternatives considered**: Random spawns from a seeded generator per phase. Rejected because
it is harder to make sure every incident is reachable and fair at a demo, and the spec asks for
a fixed schedule.

## R6 — Meter, score, stars and ending

**Decision**:

- **Condition**: a value from 0 to 100. It drains by `level.drainPerUrgentPerS` (starting
  guess 1.2) per urgent incident per second. Each repair refills it by `level.refill.normal`
  (5) or by `level.refill.early` (8) when the incident was repaired before turning urgent. It
  is clamped to the range 0–100.
- **Score**: `kind.points`, plus `level.earlyBonus` (starting guess 50) when the incident was
  repaired early.
- **Goal**: `goalReached` becomes true when the repaired count reaches `level.target`. A
  "goal" event fires once.
- **End**: the round ends when either of these happens:
  - the clock reaches the total phase length (`reason: "cleared"`);
  - condition reaches 0 (`reason: "collapsed"`).

  In both cases the result is `won = goalReached`.
- **Stars**: 0 on a loss. On a win, `1 + (score >= stars[0]) + (score >= stars[1])`, using the
  two thresholds in `level.stars`.

**Rationale**: This implements Clarifications 3 and 4 and FR-017a/18/19 directly. Making the
first star a "win" star means any win shows at least one star, as the spec says (1–3 stars
on a win).

## R7 — Screen flow changes

**Decision**: Add a `result` state to `ScreenMachine` with these transitions:

- `playing --finish--> result`
- `result --retry--> playing`
- `result --toMenu--> menu`

Esc does nothing on `result`. `LevelRun` listens for `change` events:

- **menu→playing**, **result→playing**: start a fresh round.
- **paused→playing**: no change; the round simply carries on.
- **→menu**: drop the round.

When the round ends, `LevelRun` calls `screens.finish()`.

**Rationale**: This reuses the existing focus, fade and input-enable behaviour in `MenuUI` and
`GameSession` (input is disabled outside `playing`, so the map can't be clicked behind the
result card). `GameSession` already restores the start view on menu→playing, and it is
extended to do the same on result→playing.

## R8 — Drawing and HUD split

**Decision**:

- **On the canvas** (`js/adapters/render/level-layer.js`):
  - the crew, as a renderer drawable, so it is depth-sorted with buildings (FR-015);
  - incident markers and progress rings, drawn above objects in a top overlay so they are
    never hidden behind a building;
  - off-screen arrows, drawn along the screen edge.

  Markers use colour **and** an icon (`!` for new, `!!` with a red ring for urgent, a wrench
  for repairing; FR-007).
- **In the DOM** (`js/adapters/ui/hud.js` + `css/hud.css`): top bar (phase, timer, goal,
  `n / 6`, score, condition meter), incident panel, phase/goal banners, hint bubble with
  **Skip hints**, and the result card (inside `#menu-layer` like the other cards).

**Rationale**: Text, buttons and focus are easier and more accessible in the DOM, and they
match the menu's look. Things that follow the map have to be on the canvas.

**Vehicle art**: `js/adapters/art/vehicle-art.js` maps a facing to the
`Vehicles/veh_truck_yellow_<DIR>.png` file. It has no DOM, so it can be tested like
`object-art`.

## R9 — Input for incidents and arrows

**Decision**: `Input` gains one optional hook, `clickHandler(sx, sy, tile)`, which is called
on a left click before the normal tile selection. If the hook returns `true`, the click is
consumed. `LevelLayer` provides it, in this order:

1. If the click hits an off-screen arrow, glide the camera to that incident.
2. If it hits a marker, or a tile/footprint with an active incident, select that incident.
3. Otherwise return `false`, so normal tile selection runs and the incident panel closes.

Tab hidden: `MenuUI` listens for `visibilitychange` and dispatches `pause` when the document
becomes hidden while `playing`. It does **not** resume automatically, so the player comes back
to the pause menu.

**Rationale**: This is the smallest change to `Input`, and the existing pan/zoom/selection
behaviour is untouched (FR-025).

## R10 — Rain intensity per phase

**Decision**: The `MCW.rain` simulation gets an `active` count, so only the first `active`
drops of a fixed pool are updated and drawn. The pool size is 400, and the menu stays at 160.
Calling `MCW.rain.setIntensity(r, k)` with `k` from 0 to 1 sets `active = round(k * count)`;
new drops enter from the top, so heavier rain fills in naturally.

`RainLayer` is enabled while the menu background is active **or** a round is running. Its
intensity comes from `LevelRun.rainIntensity()`: 0.4 for Drizzle, 0.7 for Downpour, 1.0 for
Peak storm, 0 after "Storm cleared", and the menu value on the menu. The intensity eases over
about 1 s.

**Rationale**: FR-004a ("rain visibly heavier") with no per-frame allocation (Principle IV).
400 short line segments in a single path stay well inside the 60 FPS budget.

## R11 — Level and map files

**Decision**:

- `maps/trial.js` holds the trial map: about 20×20 tiles with a canal and one bridge, a garage
  depot, and named buildings (`id`) used as incident targets. It is made with the decorator
  (feature 004) and exported.
- `levels/trial.js` holds the level definition, registered with `MCW.levels.register({...})`
  (new `js/infrastructure/level-registry.js`, which works the same way as `MCW.maps`).
- Boot rule in `main.js`: when no `?map=` is given, or `?map=` names the level's map, the
  trial level is used. Any other `?map=` shows that map in free-look mode, as today.
- At boot the level is checked with `MCW.checkLevel`. If there are problems, they are logged
  and the game falls back to free look, so the build stays playable (Principle I).

**Rationale**: FR-002/FR-003 (the level is data a teammate can edit), and it reuses the map
format and decorator unchanged. Keeping the level separate from the map means the decorator's
export never has to know about incidents.

**Alternatives considered**: Adding `incidents` into the map file. Rejected because the
decorator's serializer would drop them and the map format contract would change.

## R12 — Starting numbers (tuning table)

| Value | Starting guess | Where |
|---|---|---|
| Phases | Drizzle 60 s / max 2 / rain 0.4 · Downpour 90 s / max 3 / 0.7 · Peak storm 90 s / max 4 / 1.0 | `levels/trial.js` |
| Target | 6 repairs | `levels/trial.js` |
| Schedule | 10 entries: 2 in Drizzle (the first is the tutorial, at 3 s), 4 in Downpour, 4 in Peak storm | `levels/trial.js` |
| Crew speed | 3 tiles/s | `levels/trial.js` |
| Road damage | "Road cracked", repair 4 s, warn 25 s, 100 pts | `js/domain/incident-kinds.js` |
| Building damage | "Roof damaged", repair 6 s, warn 30 s, 150 pts | `js/domain/incident-kinds.js` |
| Drain | 1.2 per urgent incident per second | `levels/trial.js` |
| Refill | +5, or +8 when early | `levels/trial.js` |
| Early bonus | +50 | `levels/trial.js` |
| Stars | 2★ ≥ 900, 3★ ≥ 1300 | `levels/trial.js` |

These are first guesses to be tuned in the playtest (SC-002, SC-003).
